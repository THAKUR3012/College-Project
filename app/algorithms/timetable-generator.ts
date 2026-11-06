import { SchedulingState } from "./constraints";
import { evaluateSoftConstraints } from "./optimizer";
import { diagnoseInfeasibility, validateCompleteSchedule } from "./validation";
import type {
  ClassInfo,
  FacultyInfo,
  ClassroomInfo,
  SubjectInfo,
  DayInfo,
  PeriodInfo,
  TeachingRequirementItem,
  FacultyAvailabilityItem,
  RoomAvailabilityItem,
  FixedSessionItem,
  TimetableSlotAssignment,
  SolverSessionUnit,
  SolverResult,
  SolverConfig,
  ConflictDetail,
} from "./types";

export function generateTimetable(
  requirements: TeachingRequirementItem[],
  classes: ClassInfo[],
  facultyList: FacultyInfo[],
  rooms: ClassroomInfo[],
  subjects: SubjectInfo[],
  days: DayInfo[],
  periods: PeriodInfo[],
  facultyAvail: FacultyAvailabilityItem[],
  roomAvail: RoomAvailabilityItem[],
  fixedSessionsList: FixedSessionItem[] = [],
  config: SolverConfig = {}
): SolverResult {
  const startTime = Date.now();
  const maxTimeMs = config.maxTimeMs ?? 10000;

  // Pre-sort periods
  const sortedPeriods = [...periods].sort((a, b) => a.periodNumber - b.periodNumber);
  const periodMapByNumber = new Map<number, number>(); // periodNumber -> periodId
  const periodNumberList: number[] = [];
  sortedPeriods.forEach((p) => {
    periodMapByNumber.set(p.periodNumber, p.id);
    periodNumberList.push(p.periodNumber);
  });

  // Map for fast subject lookup
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const facultyMap = new Map(facultyList.map((f) => [f.id, f]));

  // 1. Pre-solve Infeasibility Check
  const preCheck = diagnoseInfeasibility(
    requirements,
    classes,
    facultyList,
    rooms,
    subjects,
    days.length,
    sortedPeriods.length
  );

  if (preCheck.isInfeasible) {
    return {
      status: "infeasible",
      executionTimeMs: Date.now() - startTime,
      iterations: 0,
      optimizationScore: 0,
      softPenalty: 9999,
      entries: [],
      hardViolations: preCheck.reasons.map((r) => ({
        type: "infeasible_precondition",
        severity: "hard",
        description: r,
        entityType: "requirement",
      })),
      softViolations: [],
      diagnosisSummary: `Problem is fundamentally infeasible before solving:\n• ${preCheck.reasons.join(
        "\n• "
      )}`,
      metrics: {
        totalRequiredSessions: requirements.reduce((acc, r) => acc + r.weeklySessionsRequired, 0),
        assignedSessions: 0,
        facultyWorkload: {},
        roomUtilization: {},
        softPenalties: {
          facultyGapsPenalty: 0,
          dailyOverloadPenalty: 0,
          subjectClusteringPenalty: 0,
          preferredSlotBonus: 0,
        },
      },
    };
  }

  // 2. Initialize State
  const state = new SchedulingState(
    classes,
    facultyList,
    rooms,
    subjects,
    facultyAvail,
    roomAvail
  );

  // 3. Pre-place Fixed Sessions
  const initialFixedAssignments: TimetableSlotAssignment[] = [];
  for (const fs of fixedSessionsList) {
    const fixedPeriod = sortedPeriods.find((p) => p.id === fs.startPeriodId);
    if (!fixedPeriod) continue;

    const check = state.canPlaceSlot(
      fs.classId,
      fs.subjectId,
      fs.facultyId,
      fs.classroomId,
      fs.dayId,
      fixedPeriod.periodNumber,
      fs.durationPeriods,
      periodMapByNumber
    );

    if (check.allowed) {
      const placed = state.placeSlot(
        fs.classId,
        fs.subjectId,
        fs.facultyId,
        fs.classroomId,
        fs.dayId,
        fixedPeriod.periodNumber,
        fs.durationPeriods,
        periodMapByNumber,
        true
      );
      initialFixedAssignments.push(...placed);
    }
  }

  // 4. Deconstruct Requirements into Discrete Session Units
  const sessionUnits: SolverSessionUnit[] = [];
  let unitCounter = 1;

  for (const req of requirements) {
    const sub = subjectMap.get(req.subjectId);
    const consecutive = req.consecutivePeriods || (sub?.consecutiveSlotsRequired ?? 1);
    const numSessions = Math.floor(req.weeklySessionsRequired / consecutive);

    for (let i = 0; i < numSessions; i++) {
      // Priority heuristic: labs & multi-period sessions are most constrained
      const priority =
        (consecutive > 1 ? 100 : 0) +
        (sub?.requiredRoomType === "lab" ? 50 : 0) +
        req.weeklySessionsRequired * 2;

      sessionUnits.push({
        unitId: `U-${unitCounter++}`,
        requirementId: req.id,
        classId: req.classId,
        subjectId: req.subjectId,
        facultyId: req.facultyId,
        consecutiveSlots: consecutive,
        preferredRoomId: req.preferredRoomId,
        priorityScore: priority,
      });
    }

    // Remainder sessions if any
    const remainder = req.weeklySessionsRequired % consecutive;
    for (let i = 0; i < remainder; i++) {
      sessionUnits.push({
        unitId: `U-${unitCounter++}`,
        requirementId: req.id,
        classId: req.classId,
        subjectId: req.subjectId,
        facultyId: req.facultyId,
        consecutiveSlots: 1,
        preferredRoomId: req.preferredRoomId,
        priorityScore: 10,
      });
    }
  }

  // Sort units descending by priority (hardest to fit first)
  sessionUnits.sort((a, b) => b.priorityScore - a.priorityScore);

  // 5. Backtracking Engine
  let iterations = 0;
  let bestSolution: TimetableSlotAssignment[] | null = null;
  let bestScore = -1;
  let bestSoftViolations: ConflictDetail[] = [];
  let bestPenalty = 999999;
  let timeoutReached = false;

  const currentAssignments: TimetableSlotAssignment[] = [...initialFixedAssignments];

  // Map of preferred faculty slots for ordering heuristics
  const facultyPreferredSlots = new Set<string>();
  for (const fa of facultyAvail) {
    if (fa.status === "preferred") {
      facultyPreferredSlots.add(`${fa.facultyId}:${fa.dayId}:${fa.periodId}`);
    }
  }

  function search(unitIndex: number): boolean {
    iterations++;

    if (Date.now() - startTime > maxTimeMs) {
      timeoutReached = true;
      return bestSolution !== null;
    }

    // Base Case: All units scheduled!
    if (unitIndex >= sessionUnits.length) {
      // Evaluate soft constraints
      const softEval = evaluateSoftConstraints(
        currentAssignments,
        facultyList,
        days,
        periods,
        facultyAvail
      );

      if (softEval.score > bestScore) {
        bestScore = softEval.score;
        bestPenalty = softEval.totalPenalty;
        bestSoftViolations = softEval.softViolations;
        bestSolution = [...currentAssignments];
      }

      // If we find an acceptable score, stop early
      if (bestScore >= 60 || config.enableOptimization === false) {
        return true;
      }
      return false; // continue branch & bound for higher quality
    }

    const unit = sessionUnits[unitIndex];
    const sub = subjectMap.get(unit.subjectId)!;
    const cls = classMap.get(unit.classId)!;

    // Filter candidate rooms
    const candidateRooms = rooms.filter((r) => {
      if (!r.isActive) return false;
      if (r.capacity < cls.studentCount) return false;
      if (sub.requiredRoomType === "lab") return r.roomType === "lab";
      if (sub.requiredRoomType === "seminar") return r.roomType === "seminar" || r.roomType === "lecture";
      return r.roomType === "lecture" || r.roomType === "seminar";
    });

    // If unit has a preferred room and it's compatible, put it first
    if (unit.preferredRoomId) {
      candidateRooms.sort((a, b) => (a.id === unit.preferredRoomId ? -1 : b.id === unit.preferredRoomId ? 1 : 0));
    }

    // Build and order candidate slot tuples: (day, periodNumber, room)
    interface CandidateSlot {
      day: DayInfo;
      startPeriodNumber: number;
      room: ClassroomInfo;
      score: number;
    }

    const candidateSlots: CandidateSlot[] = [];

    for (const d of days) {
      for (let pIdx = 0; pIdx <= sortedPeriods.length - unit.consecutiveSlots; pIdx++) {
        const startPNum = sortedPeriods[pIdx].periodNumber;

        for (const rm of candidateRooms) {
          const check = state.canPlaceSlot(
            unit.classId,
            unit.subjectId,
            unit.facultyId,
            rm.id,
            d.id,
            startPNum,
            unit.consecutiveSlots,
            periodMapByNumber
          );

          if (check.allowed) {
            // Heuristic scoring for candidate slot:
            // 1. Penalize if class already has this subject today
            const timesToday = state.getClassSubjectCountOnDay(unit.classId, d.id, unit.subjectId);
            let slotScore = 100 - timesToday * 50;

            // 2. Bonus if faculty preferred slot
            const firstPeriodId = periodMapByNumber.get(startPNum)!;
            if (facultyPreferredSlots.has(`${unit.facultyId}:${d.id}:${firstPeriodId}`)) {
              slotScore += 25;
            }

            // 3. Bonus if matches preferred room
            if (unit.preferredRoomId === rm.id) {
              slotScore += 15;
            }

            candidateSlots.push({
              day: d,
              startPeriodNumber: startPNum,
              room: rm,
              score: slotScore,
            });
          }
        }
      }
    }

    // Sort candidate slots descending by heuristic score
    candidateSlots.sort((a, b) => b.score - a.score);

    // Try candidate slots
    for (const slot of candidateSlots) {
      const placed = state.placeSlot(
        unit.classId,
        unit.subjectId,
        unit.facultyId,
        slot.room.id,
        slot.day.id,
        slot.startPeriodNumber,
        unit.consecutiveSlots,
        periodMapByNumber,
        false
      );

      for (const p of placed) currentAssignments.push(p);

      const found = search(unitIndex + 1);
      if (found && bestScore >= 92) return true;

      // Backtrack
      for (let i = 0; i < placed.length; i++) currentAssignments.pop();
      state.removeSlot(
        unit.classId,
        unit.subjectId,
        unit.facultyId,
        slot.room.id,
        slot.day.id,
        slot.startPeriodNumber,
        unit.consecutiveSlots,
        periodMapByNumber
      );

      if (timeoutReached) break;
    }

    return false;
  }

  // Execute Search
  search(0);

  const executionTimeMs = Date.now() - startTime;
  const finalEntries = bestSolution ?? currentAssignments;

  // Post-validation
  const validation = validateCompleteSchedule(
    finalEntries,
    requirements,
    classes,
    facultyList,
    rooms,
    subjects,
    facultyAvail,
    roomAvail
  );

  // Compute metrics
  const facultyWorkload: Record<number, number> = {};
  const roomUtilization: Record<number, number> = {};
  for (const f of facultyList) facultyWorkload[f.id] = 0;
  for (const r of rooms) roomUtilization[r.id] = 0;

  for (const entry of finalEntries) {
    facultyWorkload[entry.facultyId] = (facultyWorkload[entry.facultyId] ?? 0) + 1;
    roomUtilization[entry.classroomId] = (roomUtilization[entry.classroomId] ?? 0) + 1;
  }

  const totalRequiredSessions = requirements.reduce((acc, r) => acc + r.weeklySessionsRequired, 0);

  // Determine solver status
  let status: SolverResult["status"] = "feasible";
  if (!bestSolution || finalEntries.length < totalRequiredSessions || !validation.isValid) {
    status = timeoutReached ? "unknown" : "infeasible";
  } else if (bestScore >= 85) {
    status = "optimal";
  }

  let diagnosisSummary = "";
  if (status === "optimal") {
    diagnosisSummary = `Optimal timetable generated with high quality score (${bestScore}/100). All ${totalRequiredSessions} weekly periods scheduled with zero hard constraint violations.`;
  } else if (status === "feasible") {
    diagnosisSummary = `Feasible timetable generated (score: ${bestScore}/100). All hard constraints satisfied; soft constraints balanced within solver time limits.`;
  } else if (status === "unknown") {
    diagnosisSummary = `Solver reached time limit of ${maxTimeMs}ms without converging to a fully feasible schedule. Try increasing solver time or relaxing constraints.`;
  } else {
    diagnosisSummary = `Infeasible timetable generation: Could not satisfy all hard constraints simultaneously. ${validation.hardConflicts
      .map((c) => c.description)
      .slice(0, 3)
      .join("; ")}`;
  }

  return {
    status,
    executionTimeMs,
    iterations,
    optimizationScore: bestSolution ? bestScore : 0,
    softPenalty: bestSolution ? bestPenalty : 9999,
    entries: finalEntries,
    hardViolations: validation.hardConflicts,
    softViolations: bestSoftViolations,
    diagnosisSummary,
    metrics: {
      totalRequiredSessions,
      assignedSessions: finalEntries.length,
      facultyWorkload,
      roomUtilization,
      softPenalties: {
        facultyGapsPenalty: 0,
        dailyOverloadPenalty: 0,
        subjectClusteringPenalty: 0,
        preferredSlotBonus: 0,
      },
    },
  };
}
