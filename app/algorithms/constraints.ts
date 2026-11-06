import type {
  ClassInfo,
  FacultyInfo,
  ClassroomInfo,
  SubjectInfo,
  FacultyAvailabilityItem,
  RoomAvailabilityItem,
  TimetableSlotAssignment,
  AvailabilityStatus,
  ConflictDetail,
} from "./types";

export class SchedulingState {
  // Key strings: `${id}:${dayId}:${periodId}`
  private classOccupiedSet = new Set<string>();
  private facultyOccupiedSet = new Set<string>();
  private roomOccupiedSet = new Set<string>();

  // Lookups
  private facultyAvailabilityMap = new Map<string, AvailabilityStatus>();
  private roomAvailabilityMap = new Map<string, boolean>();

  // Workloads
  private facultyWorkloadMap = new Map<number, number>();
  // Class subject distribution: `${classId}:${dayId}:${subjectId}` -> count
  private classSubjectDayMap = new Map<string, number>();

  // Fast entity maps
  public classesMap = new Map<number, ClassInfo>();
  public facultyMap = new Map<number, FacultyInfo>();
  public roomsMap = new Map<number, ClassroomInfo>();
  public subjectsMap = new Map<number, SubjectInfo>();

  constructor(
    classes: ClassInfo[],
    facultyList: FacultyInfo[],
    rooms: ClassroomInfo[],
    subjectsList: SubjectInfo[],
    facultyAvail: FacultyAvailabilityItem[],
    roomAvail: RoomAvailabilityItem[]
  ) {
    for (const c of classes) this.classesMap.set(c.id, c);
    for (const f of facultyList) {
      this.facultyMap.set(f.id, f);
      this.facultyWorkloadMap.set(f.id, 0);
    }
    for (const r of rooms) this.roomsMap.set(r.id, r);
    for (const s of subjectsList) this.subjectsMap.set(s.id, s);

    for (const fa of facultyAvail) {
      this.facultyAvailabilityMap.set(`${fa.facultyId}:${fa.dayId}:${fa.periodId}`, fa.status);
    }
    for (const ra of roomAvail) {
      this.roomAvailabilityMap.set(`${ra.classroomId}:${ra.dayId}:${ra.periodId}`, ra.isAvailable);
    }
  }

  public clone(): SchedulingState {
    const next = new SchedulingState([], [], [], [], [], []);
    next.classOccupiedSet = new Set(this.classOccupiedSet);
    next.facultyOccupiedSet = new Set(this.facultyOccupiedSet);
    next.roomOccupiedSet = new Set(this.roomOccupiedSet);
    next.facultyAvailabilityMap = new Map(this.facultyAvailabilityMap);
    next.roomAvailabilityMap = new Map(this.roomAvailabilityMap);
    next.facultyWorkloadMap = new Map(this.facultyWorkloadMap);
    next.classSubjectDayMap = new Map(this.classSubjectDayMap);
    next.classesMap = this.classesMap;
    next.facultyMap = this.facultyMap;
    next.roomsMap = this.roomsMap;
    next.subjectsMap = this.subjectsMap;
    return next;
  }

  public isClassFree(classId: number, dayId: number, periodId: number): boolean {
    return !this.classOccupiedSet.has(`${classId}:${dayId}:${periodId}`);
  }

  public isFacultyFree(facultyId: number, dayId: number, periodId: number): boolean {
    return !this.facultyOccupiedSet.has(`${facultyId}:${dayId}:${periodId}`);
  }

  public isRoomFree(roomId: number, dayId: number, periodId: number): boolean {
    return !this.roomOccupiedSet.has(`${roomId}:${dayId}:${periodId}`);
  }

  public getFacultyAvailability(facultyId: number, dayId: number, periodId: number): AvailabilityStatus {
    return this.facultyAvailabilityMap.get(`${facultyId}:${dayId}:${periodId}`) ?? "available";
  }

  public isRoomAvailable(roomId: number, dayId: number, periodId: number): boolean {
    return this.roomAvailabilityMap.get(`${roomId}:${dayId}:${periodId}`) ?? true;
  }

  public getFacultyWorkload(facultyId: number): number {
    return this.facultyWorkloadMap.get(facultyId) ?? 0;
  }

  public getClassSubjectCountOnDay(classId: number, dayId: number, subjectId: number): number {
    return this.classSubjectDayMap.get(`${classId}:${dayId}:${subjectId}`) ?? 0;
  }

  /**
   * Check if placing `duration` consecutive periods starting at `startPeriodId` is valid.
   */
  public canPlaceSlot(
    classId: number,
    subjectId: number,
    facultyId: number,
    roomId: number,
    dayId: number,
    startPeriodNumber: number,
    duration: number,
    periodMapByNumber: Map<number, number> // periodNumber -> periodId
  ): { allowed: boolean; reason?: string } {
    const cls = this.classesMap.get(classId);
    const room = this.roomsMap.get(roomId);
    const subject = this.subjectsMap.get(subjectId);
    const fac = this.facultyMap.get(facultyId);

    if (!cls || !room || !subject || !fac) {
      return { allowed: false, reason: "Entity definition missing" };
    }

    // 1. Room capacity check
    if (room.capacity < cls.studentCount) {
      return {
        allowed: false,
        reason: `Room ${room.roomNumber} capacity (${room.capacity}) is less than class ${cls.name} size (${cls.studentCount})`,
      };
    }

    // 2. Room type check
    if (subject.requiredRoomType === "lab" && room.roomType !== "lab") {
      return {
        allowed: false,
        reason: `Subject ${subject.code} requires lab room, but ${room.roomNumber} is ${room.roomType}`,
      };
    }
    if (subject.requiredRoomType === "seminar" && room.roomType !== "seminar" && room.roomType !== "lecture") {
      return {
        allowed: false,
        reason: `Subject ${subject.code} requires seminar/lecture room`,
      };
    }

    // 3. Faculty workload limit
    const currentHours = this.getFacultyWorkload(facultyId);
    if (currentHours + duration > fac.maxWeeklyHours) {
      return {
        allowed: false,
        reason: `Faculty ${fac.fullName} max weekly workload (${fac.maxWeeklyHours} hrs) would be exceeded`,
      };
    }

    // Check each period in the block
    for (let offset = 0; offset < duration; offset++) {
      const pNum = startPeriodNumber + offset;
      const periodId = periodMapByNumber.get(pNum);
      if (!periodId) {
        return { allowed: false, reason: `Period offset ${pNum} does not exist on schedule` };
      }

      // 4. Class conflict
      if (!this.isClassFree(classId, dayId, periodId)) {
        return { allowed: false, reason: `Class ${cls.name} already has a session at day ${dayId}, period ${pNum}` };
      }

      // 5. Faculty conflict
      if (!this.isFacultyFree(facultyId, dayId, periodId)) {
        return { allowed: false, reason: `Faculty ${fac.fullName} is already assigned at day ${dayId}, period ${pNum}` };
      }

      // 6. Classroom conflict
      if (!this.isRoomFree(roomId, dayId, periodId)) {
        return { allowed: false, reason: `Room ${room.roomNumber} is occupied at day ${dayId}, period ${pNum}` };
      }

      // 7. Faculty unavailable
      if (this.getFacultyAvailability(facultyId, dayId, periodId) === "unavailable") {
        return { allowed: false, reason: `Faculty ${fac.fullName} marked unavailable at day ${dayId}, period ${pNum}` };
      }

      // 8. Room unavailable
      if (!this.isRoomAvailable(roomId, dayId, periodId)) {
        return { allowed: false, reason: `Room ${room.roomNumber} is marked unavailable at day ${dayId}, period ${pNum}` };
      }
    }

    return { allowed: true };
  }

  public placeSlot(
    classId: number,
    subjectId: number,
    facultyId: number,
    roomId: number,
    dayId: number,
    startPeriodNumber: number,
    duration: number,
    periodMapByNumber: Map<number, number>,
    isFixed = false
  ): TimetableSlotAssignment[] {
    const assigned: TimetableSlotAssignment[] = [];
    for (let offset = 0; offset < duration; offset++) {
      const pNum = startPeriodNumber + offset;
      const periodId = periodMapByNumber.get(pNum)!;

      this.classOccupiedSet.add(`${classId}:${dayId}:${periodId}`);
      this.facultyOccupiedSet.add(`${facultyId}:${dayId}:${periodId}`);
      this.roomOccupiedSet.add(`${roomId}:${dayId}:${periodId}`);

      assigned.push({
        classId,
        subjectId,
        facultyId,
        classroomId: roomId,
        dayId,
        periodId,
        isFixed,
      });
    }

    // Update workload
    const curWorkload = this.getFacultyWorkload(facultyId);
    this.facultyWorkloadMap.set(facultyId, curWorkload + duration);

    // Update subject distribution count
    const key = `${classId}:${dayId}:${subjectId}`;
    this.classSubjectDayMap.set(key, (this.classSubjectDayMap.get(key) ?? 0) + 1);

    return assigned;
  }

  public removeSlot(
    classId: number,
    subjectId: number,
    facultyId: number,
    roomId: number,
    dayId: number,
    startPeriodNumber: number,
    duration: number,
    periodMapByNumber: Map<number, number>
  ): void {
    for (let offset = 0; offset < duration; offset++) {
      const pNum = startPeriodNumber + offset;
      const periodId = periodMapByNumber.get(pNum)!;

      this.classOccupiedSet.delete(`${classId}:${dayId}:${periodId}`);
      this.facultyOccupiedSet.delete(`${facultyId}:${dayId}:${periodId}`);
      this.roomOccupiedSet.delete(`${roomId}:${dayId}:${periodId}`);
    }

    const curWorkload = this.getFacultyWorkload(facultyId);
    this.facultyWorkloadMap.set(facultyId, Math.max(0, curWorkload - duration));

    const key = `${classId}:${dayId}:${subjectId}`;
    const curCount = this.classSubjectDayMap.get(key) ?? 0;
    if (curCount <= 1) {
      this.classSubjectDayMap.delete(key);
    } else {
      this.classSubjectDayMap.set(key, curCount - 1);
    }
  }
}
