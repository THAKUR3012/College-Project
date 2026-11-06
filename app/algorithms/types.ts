export type RoomType = "lecture" | "lab" | "seminar";
export type SubjectType = "theory" | "practical" | "seminar";
export type AvailabilityStatus = "available" | "unavailable" | "preferred";

export interface DayInfo {
  id: number;
  dayName: string;
  dayOrder: number;
}

export interface PeriodInfo {
  id: number;
  periodNumber: number;
  name: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

export interface ClassInfo {
  id: number;
  name: string;
  studentCount: number;
  semesterId: number;
  courseId: number;
}

export interface FacultyInfo {
  id: number;
  fullName: string;
  maxWeeklyHours: number;
  maxConsecutiveHours: number;
  department: string;
}

export interface ClassroomInfo {
  id: number;
  roomNumber: string;
  capacity: number;
  roomType: RoomType;
  building: string;
  isActive: boolean;
}

export interface SubjectInfo {
  id: number;
  code: string;
  name: string;
  type: SubjectType;
  weeklySessions: number;
  consecutiveSlotsRequired: number;
  requiredRoomType: RoomType;
  colorCode: string;
}

export interface TeachingRequirementItem {
  id: number;
  classId: number;
  subjectId: number;
  facultyId: number;
  weeklySessionsRequired: number;
  consecutivePeriods: number; // 1 or 2
  preferredRoomId?: number | null;
}

export interface FacultySubjectEligibility {
  facultyId: number;
  subjectId: number;
}

export interface FacultyAvailabilityItem {
  facultyId: number;
  dayId: number;
  periodId: number;
  status: AvailabilityStatus;
  reason?: string | null;
}

export interface RoomAvailabilityItem {
  classroomId: number;
  dayId: number;
  periodId: number;
  isAvailable: boolean;
  reason?: string | null;
}

export interface FixedSessionItem {
  id?: number;
  classId: number;
  subjectId: number;
  facultyId: number;
  classroomId: number;
  dayId: number;
  startPeriodId: number;
  durationPeriods: number;
  note?: string | null;
}

export interface TimetableSlotAssignment {
  classId: number;
  subjectId: number;
  facultyId: number;
  classroomId: number;
  dayId: number;
  periodId: number;
  isFixed: boolean;
}

export interface SolverSessionUnit {
  unitId: string;
  requirementId: number;
  classId: number;
  subjectId: number;
  facultyId: number;
  consecutiveSlots: number;
  preferredRoomId?: number | null;
  priorityScore: number;
}

export type SolverStatus = "feasible" | "optimal" | "infeasible" | "unknown" | "running" | "failed";

export interface ConflictDetail {
  type: string;
  severity: "hard" | "soft";
  description: string;
  entityType: "faculty" | "classroom" | "class" | "requirement";
  entityId?: number;
  periodId?: number;
  dayId?: number;
}

export interface SolverMetrics {
  totalRequiredSessions: number;
  assignedSessions: number;
  facultyWorkload: Record<number, number>; // facultyId -> total hours
  roomUtilization: Record<number, number>; // classroomId -> total hours
  softPenalties: {
    facultyGapsPenalty: number;
    dailyOverloadPenalty: number;
    subjectClusteringPenalty: number;
    preferredSlotBonus: number;
  };
}

export interface SolverResult {
  status: SolverStatus;
  executionTimeMs: number;
  iterations: number;
  optimizationScore: number; // 0 - 100
  softPenalty: number;
  entries: TimetableSlotAssignment[];
  hardViolations: ConflictDetail[];
  softViolations: ConflictDetail[];
  diagnosisSummary: string;
  metrics: SolverMetrics;
}

export interface SolverConfig {
  maxTimeMs?: number;
  enableOptimization?: boolean;
  allowRoomTypeDowngrade?: boolean; // e.g. lecture in seminar
}
