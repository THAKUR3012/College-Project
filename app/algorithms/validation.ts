import type {
  ClassInfo,
  FacultyInfo,
  ClassroomInfo,
  SubjectInfo,
  TeachingRequirementItem,
  FacultyAvailabilityItem,
  RoomAvailabilityItem,
  TimetableSlotAssignment,
  ConflictDetail,
} from "./types";

export interface ValidationReport {
  isValid: boolean;
  hardConflicts: ConflictDetail[];
  diagnosis: string[];
}

export function validateCompleteSchedule(
  entries: TimetableSlotAssignment[],
  requirements: TeachingRequirementItem[],
  classes: ClassInfo[],
  facultyList: FacultyInfo[],
  rooms: ClassroomInfo[],
  subjects: SubjectInfo[],
  facultyAvail: FacultyAvailabilityItem[],
  roomAvail: RoomAvailabilityItem[]
): ValidationReport {
  const hardConflicts: ConflictDetail[] = [];
  const diagnosis: string[] = [];

  const classMap = new Map(classes.map((c) => [c.id, c]));
  const facultyMap = new Map(facultyList.map((f) => [f.id, f]));
  const roomMap = new Map(rooms.map((r) => [r.id, r]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // 1. Conflict tracker maps
  const classOccupied = new Map<string, TimetableSlotAssignment>();
  const facultyOccupied = new Map<string, TimetableSlotAssignment>();
  const roomOccupied = new Map<string, TimetableSlotAssignment>();

  // Workload tracking
  const facultyHours = new Map<number, number>();
  for (const f of facultyList) facultyHours.set(f.id, 0);

  // Requirements fulfillment tracking: `${classId}:${subjectId}` -> count
  const reqCount = new Map<string, number>();

  // Check each entry
  for (const entry of entries) {
    const slotKey = `${entry.dayId}:${entry.periodId}`;
    const cls = classMap.get(entry.classId);
    const fac = facultyMap.get(entry.facultyId);
    const rm = roomMap.get(entry.classroomId);
    const sub = subjectMap.get(entry.subjectId);

    // Hard 1: Class overlap
    const clsKey = `${entry.classId}:${slotKey}`;
    if (classOccupied.has(clsKey)) {
      hardConflicts.push({
        type: "class_double_booked",
        severity: "hard",
        description: `Class ${cls?.name ?? entry.classId} has overlapping sessions at Day ${entry.dayId}, Period ${entry.periodId}`,
        entityType: "class",
        entityId: entry.classId,
        dayId: entry.dayId,
        periodId: entry.periodId,
      });
    } else {
      classOccupied.set(clsKey, entry);
    }

    // Hard 2: Faculty overlap
    const facKey = `${entry.facultyId}:${slotKey}`;
    if (facultyOccupied.has(facKey)) {
      hardConflicts.push({
        type: "faculty_double_booked",
        severity: "hard",
        description: `Faculty ${fac?.fullName ?? entry.facultyId} is double-booked at Day ${entry.dayId}, Period ${entry.periodId}`,
        entityType: "faculty",
        entityId: entry.facultyId,
        dayId: entry.dayId,
        periodId: entry.periodId,
      });
    } else {
      facultyOccupied.set(facKey, entry);
    }

    // Hard 3: Room overlap
    const rmKey = `${entry.classroomId}:${slotKey}`;
    if (roomOccupied.has(rmKey)) {
      hardConflicts.push({
        type: "room_double_booked",
        severity: "hard",
        description: `Room ${rm?.roomNumber ?? entry.classroomId} is double-booked at Day ${entry.dayId}, Period ${entry.periodId}`,
        entityType: "classroom",
        entityId: entry.classroomId,
        dayId: entry.dayId,
        periodId: entry.periodId,
      });
    } else {
      roomOccupied.set(rmKey, entry);
    }

    // Hard 4: Room capacity
    if (rm && cls && rm.capacity < cls.studentCount) {
      hardConflicts.push({
        type: "room_capacity_exceeded",
        severity: "hard",
        description: `Class ${cls.name} (${cls.studentCount} students) exceeds room ${rm.roomNumber} capacity (${rm.capacity})`,
        entityType: "classroom",
        entityId: rm.id,
        dayId: entry.dayId,
        periodId: entry.periodId,
      });
    }

    // Hard 5: Room type mismatch
    if (sub && rm) {
      if (sub.requiredRoomType === "lab" && rm.roomType !== "lab") {
        hardConflicts.push({
          type: "room_type_mismatch",
          severity: "hard",
          description: `Practical subject ${sub.code} assigned to non-lab room ${rm.roomNumber}`,
          entityType: "classroom",
          entityId: rm.id,
          dayId: entry.dayId,
          periodId: entry.periodId,
        });
      }
    }

    // Workload increment
    facultyHours.set(entry.facultyId, (facultyHours.get(entry.facultyId) ?? 0) + 1);

    // Requirement count
    const rKey = `${entry.classId}:${entry.subjectId}`;
    reqCount.set(rKey, (reqCount.get(rKey) ?? 0) + 1);
  }

  // Hard 6: Faculty max weekly workload
  for (const fac of facultyList) {
    const hours = facultyHours.get(fac.id) ?? 0;
    if (hours > fac.maxWeeklyHours) {
      hardConflicts.push({
        type: "max_workload_exceeded",
        severity: "hard",
        description: `Faculty ${fac.fullName} assigned ${hours} hours, exceeding limit of ${fac.maxWeeklyHours} hours`,
        entityType: "faculty",
        entityId: fac.id,
      });
    }
  }

  // Hard 7: Check required sessions vs assigned
  for (const req of requirements) {
    const assigned = reqCount.get(`${req.classId}:${req.subjectId}`) ?? 0;
    if (assigned < req.weeklySessionsRequired) {
      const cls = classMap.get(req.classId);
      const sub = subjectMap.get(req.subjectId);
      hardConflicts.push({
        type: "unmet_weekly_sessions",
        severity: "hard",
        description: `Requirement not met: Class ${cls?.name} requires ${req.weeklySessionsRequired} sessions of ${sub?.code}, but only ${assigned} were scheduled`,
        entityType: "requirement",
        entityId: req.id,
      });
    }
  }

  // Hard 8: Faculty unavailability check
  const unavailMap = new Set<string>();
  for (const fa of facultyAvail) {
    if (fa.status === "unavailable") {
      unavailMap.add(`${fa.facultyId}:${fa.dayId}:${fa.periodId}`);
    }
  }
  for (const entry of entries) {
    const key = `${entry.facultyId}:${entry.dayId}:${entry.periodId}`;
    if (unavailMap.has(key)) {
      const fac = facultyMap.get(entry.facultyId);
      hardConflicts.push({
        type: "faculty_unavailable",
        severity: "hard",
        description: `Faculty ${fac?.fullName} is scheduled during an unavailable period (Day ${entry.dayId}, Period ${entry.periodId})`,
        entityType: "faculty",
        entityId: entry.facultyId,
        dayId: entry.dayId,
        periodId: entry.periodId,
      });
    }
  }

  if (hardConflicts.length > 0) {
    diagnosis.push(`Detected ${hardConflicts.length} hard constraint violations.`);
  } else {
    diagnosis.push("All hard constraints successfully satisfied.");
  }

  return {
    isValid: hardConflicts.length === 0,
    hardConflicts,
    diagnosis,
  };
}

/**
 * Pre-solve diagnostic checks: Detects fundamentally impossible requirements BEFORE solving.
 */
export function diagnoseInfeasibility(
  requirements: TeachingRequirementItem[],
  classes: ClassInfo[],
  facultyList: FacultyInfo[],
  rooms: ClassroomInfo[],
  subjects: SubjectInfo[],
  daysCount: number,
  periodsPerDay: number
): { isInfeasible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const totalSlotsPerClass = daysCount * periodsPerDay;

  const classMap = new Map(classes.map((c) => [c.id, c]));
  const facultyMap = new Map(facultyList.map((f) => [f.id, f]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  // Check 1: Total periods demanded by each class
  const classLoad = new Map<number, number>();
  for (const req of requirements) {
    classLoad.set(req.classId, (classLoad.get(req.classId) ?? 0) + req.weeklySessionsRequired);
  }
  for (const [classId, totalHours] of classLoad.entries()) {
    if (totalHours > totalSlotsPerClass) {
      const cls = classMap.get(classId);
      reasons.push(
        `Class ${cls?.name ?? classId} requires ${totalHours} sessions, but week only has ${totalSlotsPerClass} total periods.`
      );
    }
  }

  // Check 2: Total load demanded from each faculty
  const facultyLoad = new Map<number, number>();
  for (const req of requirements) {
    facultyLoad.set(req.facultyId, (facultyLoad.get(req.facultyId) ?? 0) + req.weeklySessionsRequired);
  }
  for (const [facId, totalHours] of facultyLoad.entries()) {
    const fac = facultyMap.get(facId);
    if (fac && totalHours > fac.maxWeeklyHours) {
      reasons.push(
        `Faculty ${fac.fullName} requires ${totalHours} weekly teaching hours, exceeding max limit of ${fac.maxWeeklyHours} hours.`
      );
    }
  }

  // Check 3: Room capacity sufficiency for each class
  for (const cls of classes) {
    const suitableRooms = rooms.filter((r) => r.capacity >= cls.studentCount && r.isActive);
    if (suitableRooms.length === 0) {
      reasons.push(
        `No active classroom exists with capacity >= ${cls.studentCount} for class ${cls.name}. Maximum room capacity is ${Math.max(
          ...rooms.map((r) => r.capacity),
          0
        )}.`
      );
    }
  }

  // Check 4: Lab room capacity vs total lab requirements
  const totalLabHoursRequired = requirements
    .filter((req) => {
      const sub = subjectMap.get(req.subjectId);
      return sub?.requiredRoomType === "lab";
    })
    .reduce((sum, req) => sum + req.weeklySessionsRequired, 0);

  const labRooms = rooms.filter((r) => r.roomType === "lab" && r.isActive);
  const totalLabCapacity = labRooms.length * totalSlotsPerClass;

  if (totalLabHoursRequired > totalLabCapacity) {
    reasons.push(
      `Total lab sessions required (${totalLabHoursRequired} hrs) exceeds total available lab room capacity (${totalLabCapacity} hrs across ${labRooms.length} labs).`
    );
  }

  return {
    isInfeasible: reasons.length > 0,
    reasons,
  };
}
