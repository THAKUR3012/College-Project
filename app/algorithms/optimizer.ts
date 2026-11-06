import type {
  TimetableSlotAssignment,
  FacultyInfo,
  DayInfo,
  PeriodInfo,
  FacultyAvailabilityItem,
  ConflictDetail,
} from "./types";

export interface SoftPenaltyBreakdown {
  facultyGapsPenalty: number;
  dailyOverloadPenalty: number;
  subjectClusteringPenalty: number;
  consecutiveExceedPenalty: number;
  preferredBonus: number;
  totalPenalty: number;
  score: number; // 0 - 100
  softViolations: ConflictDetail[];
}

export function evaluateSoftConstraints(
  assignments: TimetableSlotAssignment[],
  facultyList: FacultyInfo[],
  days: DayInfo[],
  periods: PeriodInfo[],
  facultyAvail: FacultyAvailabilityItem[]
): SoftPenaltyBreakdown {
  let facultyGapsPenalty = 0;
  let dailyOverloadPenalty = 0;
  let subjectClusteringPenalty = 0;
  let consecutiveExceedPenalty = 0;
  let preferredBonus = 0;

  const softViolations: ConflictDetail[] = [];

  // Map of preferred slots: `${facId}:${dayId}:${periodId}` -> boolean
  const preferredSet = new Set<string>();
  for (const fa of facultyAvail) {
    if (fa.status === "preferred") {
      preferredSet.add(`${fa.facultyId}:${fa.dayId}:${fa.periodId}`);
    }
  }

  // Pre-sort periods by periodNumber
  const sortedPeriods = [...periods].sort((a, b) => a.periodNumber - b.periodNumber);
  const periodIndexMap = new Map<number, number>(); // periodId -> order index
  sortedPeriods.forEach((p, idx) => periodIndexMap.set(p.id, idx));

  // Build faculty schedule matrix: facultyId -> dayId -> array of period indexes occupied
  const facDaySchedule = new Map<number, Map<number, number[]>>();
  // Build class schedule matrix: classId -> dayId -> subjectId -> count
  const classDaySubjectCount = new Map<string, number>();

  for (const fac of facultyList) {
    facDaySchedule.set(fac.id, new Map());
    for (const d of days) {
      facDaySchedule.get(fac.id)!.set(d.id, []);
    }
  }

  for (const entry of assignments) {
    // Check preferred slot bonus
    const prefKey = `${entry.facultyId}:${entry.dayId}:${entry.periodId}`;
    if (preferredSet.has(prefKey)) {
      preferredBonus += 10;
    }

    // Record faculty period
    const dayMap = facDaySchedule.get(entry.facultyId);
    if (dayMap) {
      const pIdx = periodIndexMap.get(entry.periodId);
      if (pIdx !== undefined) {
        dayMap.get(entry.dayId)?.push(pIdx);
      }
    }

    // Record subject clustering
    const clsKey = `${entry.classId}:${entry.dayId}:${entry.subjectId}`;
    classDaySubjectCount.set(clsKey, (classDaySubjectCount.get(clsKey) ?? 0) + 1);
  }

  // 1. Evaluate Faculty Gaps & Consecutive Hours
  for (const fac of facultyList) {
    const dayMap = facDaySchedule.get(fac.id);
    if (!dayMap) continue;

    const dailyLoads: number[] = [];

    for (const d of days) {
      const pIndexes = dayMap.get(d.id) ?? [];
      pIndexes.sort((a, b) => a - b);
      dailyLoads.push(pIndexes.length);

      if (pIndexes.length >= 2) {
        // Gaps: periods between first and last period where faculty is idle
        const first = pIndexes[0];
        const last = pIndexes[pIndexes.length - 1];
        const span = last - first + 1;
        const gaps = span - pIndexes.length;
        if (gaps > 0) {
          facultyGapsPenalty += gaps * 15;
          softViolations.push({
            type: "faculty_idle_gap",
            severity: "soft",
            description: `Faculty ${fac.fullName} has ${gaps} idle period(s) between classes on ${d.dayName}`,
            entityType: "faculty",
            entityId: fac.id,
            dayId: d.id,
          });
        }

        // Consecutive hours check
        let consecutive = 1;
        for (let i = 1; i < pIndexes.length; i++) {
          if (pIndexes[i] === pIndexes[i - 1] + 1) {
            consecutive++;
            if (consecutive > fac.maxConsecutiveHours) {
              consecutiveExceedPenalty += 20;
              softViolations.push({
                type: "excessive_consecutive_periods",
                severity: "soft",
                description: `Faculty ${fac.fullName} scheduled for ${consecutive} consecutive periods on ${d.dayName} (limit: ${fac.maxConsecutiveHours})`,
                entityType: "faculty",
                entityId: fac.id,
                dayId: d.id,
              });
            }
          } else {
            consecutive = 1;
          }
        }
      }
    }

    // 2. Daily Workload Variance
    if (dailyLoads.length > 0) {
      const mean = dailyLoads.reduce((a, b) => a + b, 0) / dailyLoads.length;
      let variance = 0;
      for (const load of dailyLoads) {
        variance += Math.pow(load - mean, 2);
      }
      dailyOverloadPenalty += Math.round(variance * 8);
    }
  }

  // 3. Evaluate Subject Clustering (same subject multiple times on same day for a class)
  for (const [key, count] of classDaySubjectCount.entries()) {
    if (count > 1) {
      const [classIdStr, dayIdStr] = key.split(":");
      subjectClusteringPenalty += (count - 1) * 25;
      softViolations.push({
        type: "subject_clustering",
        severity: "soft",
        description: `Class has ${count} sessions of the same subject on the same day`,
        entityType: "class",
        entityId: Number(classIdStr),
        dayId: Number(dayIdStr),
      });
    }
  }

  const rawPenalty =
    facultyGapsPenalty +
    dailyOverloadPenalty +
    subjectClusteringPenalty +
    consecutiveExceedPenalty -
    preferredBonus;

  const totalPenalty = Math.max(0, rawPenalty);

  // Normalize score between 0 and 100: 100 is perfect with zero penalties
  // As penalty increases, score decays smoothly
  const score = Math.max(10, Math.round(100 / (1 + totalPenalty / 120)));

  return {
    facultyGapsPenalty,
    dailyOverloadPenalty,
    subjectClusteringPenalty,
    consecutiveExceedPenalty,
    preferredBonus,
    totalPenalty,
    score,
    softViolations,
  };
}
