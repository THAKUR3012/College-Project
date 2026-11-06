import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  time,
  date,
  mysqlEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// 1. ROLES
export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // 'admin', 'coordinator', 'faculty'
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 2. USERS
export const users = mysqlTable(
  "users",
  {
    id: int("id").autoincrement().primaryKey(),
    roleId: int("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    username: varchar("username", { length: 100 }).notNull().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_users_role").on(table.roleId),
    index("idx_users_email").on(table.email),
  ]
);

// 3. FACULTY
export const faculty = mysqlTable(
  "faculty",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    department: varchar("department", { length: 100 }).notNull(),
    designation: varchar("designation", { length: 100 }).notNull(),
    maxWeeklyHours: int("max_weekly_hours").default(20).notNull(),
    maxConsecutiveHours: int("max_consecutive_hours").default(3).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_faculty_user").on(table.userId),
    index("idx_faculty_dept").on(table.department),
  ]
);

// 4. ACADEMIC YEARS
export const academicYears = mysqlTable("academic_years", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(), // e.g., '2025-2026'
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 5. SEMESTERS
export const semesters = mysqlTable(
  "semesters",
  {
    id: int("id").autoincrement().primaryKey(),
    academicYearId: int("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 50 }).notNull(), // 'Semester 1 (Odd)'
    number: int("number").notNull(), // 1 to 8
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_semesters_year").on(table.academicYearId),
  ]
);

// 6. COURSES
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // e.g., 'BTECH-CSE'
  name: varchar("name", { length: 255 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  totalSemesters: int("total_semesters").default(8).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

// 7. CLASSES
export const classes = mysqlTable(
  "classes",
  {
    id: int("id").autoincrement().primaryKey(),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    academicYearId: int("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    semesterId: int("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 100 }).notNull(), // 'B.Tech CSE - 3rd Sem - Sec A'
    section: varchar("section", { length: 20 }).notNull(), // 'A', 'B'
    studentCount: int("student_count").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_classes_course").on(table.courseId),
    index("idx_classes_semester").on(table.semesterId),
  ]
);

// 8. SUBJECTS
export const subjects = mysqlTable(
  "subjects",
  {
    id: int("id").autoincrement().primaryKey(),
    courseId: int("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    semesterId: int("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "cascade" }),
    code: varchar("code", { length: 50 }).notNull().unique(), // 'CS301'
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["theory", "practical", "seminar"]).notNull(),
    weeklySessions: int("weekly_sessions").notNull(), // e.g., 4 sessions/week
    consecutiveSlotsRequired: int("consecutive_slots_required").default(1).notNull(), // 1 for theory, 2 for practical lab
    requiredRoomType: mysqlEnum("required_room_type", ["lecture", "lab", "seminar"]).notNull(),
    colorCode: varchar("color_code", { length: 20 }).default("#3b82f6").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_subjects_course").on(table.courseId),
    index("idx_subjects_semester").on(table.semesterId),
  ]
);

// 9. FACULTY SUBJECTS (Eligibility)
export const facultySubjects = mysqlTable(
  "faculty_subjects",
  {
    id: int("id").autoincrement().primaryKey(),
    facultyId: int("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    subjectId: int("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_fac_subj").on(table.facultyId, table.subjectId),
    index("idx_fac_subj_fac").on(table.facultyId),
    index("idx_fac_subj_subj").on(table.subjectId),
  ]
);

// 10. CLASSROOMS
export const classrooms = mysqlTable(
  "classrooms",
  {
    id: int("id").autoincrement().primaryKey(),
    roomNumber: varchar("room_number", { length: 50 }).notNull().unique(),
    building: varchar("building", { length: 100 }).notNull(),
    floor: int("floor").default(1).notNull(),
    capacity: int("capacity").notNull(),
    roomType: mysqlEnum("room_type", ["lecture", "lab", "seminar"]).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_classrooms_type").on(table.roomType),
  ]
);

// 11. WORKING DAYS
export const workingDays = mysqlTable("working_days", {
  id: int("id").autoincrement().primaryKey(),
  dayName: varchar("day_name", { length: 20 }).notNull().unique(), // 'Monday', 'Tuesday', ...
  dayOrder: int("day_order").notNull().unique(), // 1 to 5
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 12. PERIODS
export const periods = mysqlTable("periods", {
  id: int("id").autoincrement().primaryKey(),
  periodNumber: int("period_number").notNull().unique(), // 1 to 8
  name: varchar("name", { length: 50 }).notNull(), // 'Period 1'
  startTime: time("start_time").notNull(), // '09:00:00'
  endTime: time("end_time").notNull(), // '10:00:00'
  isBreak: boolean("is_break").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 13. BREAKS
export const breaks = mysqlTable("breaks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(), // 'Tea Break', 'Lunch Break'
  afterPeriodNumber: int("after_period_number").notNull(),
  durationMinutes: int("duration_minutes").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. FACULTY AVAILABILITY
export const facultyAvailability = mysqlTable(
  "faculty_availability",
  {
    id: int("id").autoincrement().primaryKey(),
    facultyId: int("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    dayId: int("day_id")
      .notNull()
      .references(() => workingDays.id, { onDelete: "cascade" }),
    periodId: int("period_id")
      .notNull()
      .references(() => periods.id, { onDelete: "cascade" }),
    status: mysqlEnum("status", ["available", "unavailable", "preferred"]).default("available").notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_fac_avail").on(table.facultyId, table.dayId, table.periodId),
    index("idx_fac_avail_fac").on(table.facultyId),
  ]
);

// 15. ROOM AVAILABILITY
export const roomAvailability = mysqlTable(
  "room_availability",
  {
    id: int("id").autoincrement().primaryKey(),
    classroomId: int("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    dayId: int("day_id")
      .notNull()
      .references(() => workingDays.id, { onDelete: "cascade" }),
    periodId: int("period_id")
      .notNull()
      .references(() => periods.id, { onDelete: "cascade" }),
    isAvailable: boolean("is_available").default(true).notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_room_avail").on(table.classroomId, table.dayId, table.periodId),
    index("idx_room_avail_room").on(table.classroomId),
  ]
);

// 16. TEACHING REQUIREMENTS (Curriculum assignments per class)
export const teachingRequirements = mysqlTable(
  "teaching_requirements",
  {
    id: int("id").autoincrement().primaryKey(),
    classId: int("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: int("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    facultyId: int("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    weeklySessionsRequired: int("weekly_sessions_required").notNull(),
    consecutivePeriods: int("consecutive_periods").default(1).notNull(), // 1 for theory, 2 for labs
    preferredRoomId: int("preferred_room_id").references(() => classrooms.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_class_subj").on(table.classId, table.subjectId),
    index("idx_req_class").on(table.classId),
    index("idx_req_fac").on(table.facultyId),
  ]
);

// 17. FIXED SESSIONS
export const fixedSessions = mysqlTable(
  "fixed_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    classId: int("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: int("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    facultyId: int("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    classroomId: int("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    dayId: int("day_id")
      .notNull()
      .references(() => workingDays.id, { onDelete: "cascade" }),
    startPeriodId: int("start_period_id")
      .notNull()
      .references(() => periods.id, { onDelete: "cascade" }),
    durationPeriods: int("duration_periods").default(1).notNull(),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_fixed_class").on(table.classId),
    index("idx_fixed_slot").on(table.dayId, table.startPeriodId),
  ]
);

// 18. TIMETABLE VERSIONS
export const timetableVersions = mysqlTable(
  "timetable_versions",
  {
    id: int("id").autoincrement().primaryKey(),
    academicYearId: int("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    semesterId: int("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 150 }).notNull(),
    versionNumber: int("version_number").notNull().default(1),
    status: mysqlEnum("status", ["draft", "published", "archived"]).default("draft").notNull(),
    optimizationScore: int("optimization_score").default(0).notNull(),
    generatedByUserId: int("generated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("idx_tt_version_sem").on(table.semesterId),
    index("idx_tt_version_status").on(table.status),
  ]
);

// 19. TIMETABLE ENTRIES
export const timetableEntries = mysqlTable(
  "timetable_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    timetableVersionId: int("timetable_version_id")
      .notNull()
      .references(() => timetableVersions.id, { onDelete: "cascade" }),
    classId: int("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: int("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    facultyId: int("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    classroomId: int("classroom_id")
      .notNull()
      .references(() => classrooms.id, { onDelete: "cascade" }),
    dayId: int("day_id")
      .notNull()
      .references(() => workingDays.id, { onDelete: "cascade" }),
    periodId: int("period_id")
      .notNull()
      .references(() => periods.id, { onDelete: "cascade" }),
    isFixed: boolean("is_fixed").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_tt_class_slot").on(table.timetableVersionId, table.classId, table.dayId, table.periodId),
    uniqueIndex("uniq_tt_fac_slot").on(table.timetableVersionId, table.facultyId, table.dayId, table.periodId),
    uniqueIndex("uniq_tt_room_slot").on(table.timetableVersionId, table.classroomId, table.dayId, table.periodId),
    index("idx_tt_version").on(table.timetableVersionId),
    index("idx_tt_class").on(table.classId),
    index("idx_tt_fac").on(table.facultyId),
    index("idx_tt_room").on(table.classroomId),
  ]
);

// 20. ASSIGNMENTS
export const assignments = mysqlTable(
  "assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    facultyId: int("faculty_id")
      .notNull()
      .references(() => faculty.id, { onDelete: "cascade" }),
    classId: int("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    subjectId: int("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    academicYearId: int("academic_year_id")
      .notNull()
      .references(() => academicYears.id, { onDelete: "cascade" }),
    semesterId: int("semester_id")
      .notNull()
      .references(() => semesters.id, { onDelete: "cascade" }),
    assignedHours: int("assigned_hours").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("uniq_assignment").on(table.facultyId, table.classId, table.subjectId, table.semesterId),
  ]
);

// 21. SOLVER RUNS
export const solverRuns = mysqlTable(
  "solver_runs",
  {
    id: int("id").autoincrement().primaryKey(),
    timetableVersionId: int("timetable_version_id")
      .references(() => timetableVersions.id, { onDelete: "set null" }),
    status: mysqlEnum("status", ["feasible", "optimal", "infeasible", "unknown", "running", "failed"]).notNull(),
    executionTimeMs: int("execution_time_ms").notNull(),
    iterations: int("iterations").default(0).notNull(),
    optimizationScore: int("optimization_score").default(0).notNull(),
    hardConflictsCount: int("hard_conflicts_count").default(0).notNull(),
    softPenalty: int("soft_penalty").default(0).notNull(),
    diagnosisSummary: text("diagnosis_summary"),
    configurationJson: text("configuration_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_solver_status").on(table.status),
  ]
);

// 22. CONFLICT REPORTS
export const conflictReports = mysqlTable(
  "conflict_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    timetableVersionId: int("timetable_version_id")
      .references(() => timetableVersions.id, { onDelete: "cascade" }),
    solverRunId: int("solver_run_id")
      .references(() => solverRuns.id, { onDelete: "cascade" }),
    conflictType: varchar("conflict_type", { length: 100 }).notNull(), // 'faculty_double_booked', 'room_double_booked', etc.
    severity: mysqlEnum("severity", ["hard", "soft"]).notNull(),
    description: text("description").notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(), // 'faculty', 'classroom', 'class', 'requirement'
    entityId: int("entity_id"),
    periodId: int("period_id").references(() => periods.id, { onDelete: "set null" }),
    dayId: int("day_id").references(() => workingDays.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_conflicts_version").on(table.timetableVersionId),
    index("idx_conflicts_sev").on(table.severity),
  ]
);

// 23. AUDIT LOGS
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(), // e.g., 'GENERATE_TIMETABLE', 'PUBLISH_VERSION', 'UPDATE_ENTRY'
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: int("entity_id"),
    detailsJson: text("details_json"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_user").on(table.userId),
    index("idx_audit_action").on(table.action),
    index("idx_audit_created").on(table.createdAt),
  ]
);

// DRIZZLE RELATIONS DEFINITIONS
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  faculty: one(faculty, {
    fields: [users.id],
    references: [faculty.userId],
  }),
  auditLogs: many(auditLogs),
}));

export const facultyRelations = relations(faculty, ({ one, many }) => ({
  user: one(users, {
    fields: [faculty.userId],
    references: [users.id],
  }),
  facultySubjects: many(facultySubjects),
  teachingRequirements: many(teachingRequirements),
  availability: many(facultyAvailability),
  timetableEntries: many(timetableEntries),
  assignments: many(assignments),
}));

export const facultyAvailabilityRelations = relations(facultyAvailability, ({ one }) => ({
  faculty: one(faculty, {
    fields: [facultyAvailability.facultyId],
    references: [faculty.id],
  }),
  day: one(workingDays, {
    fields: [facultyAvailability.dayId],
    references: [workingDays.id],
  }),
  period: one(periods, {
    fields: [facultyAvailability.periodId],
    references: [periods.id],
  }),
}));

export const roomAvailabilityRelations = relations(roomAvailability, ({ one }) => ({
  classroom: one(classrooms, {
    fields: [roomAvailability.classroomId],
    references: [classrooms.id],
  }),
  day: one(workingDays, {
    fields: [roomAvailability.dayId],
    references: [workingDays.id],
  }),
  period: one(periods, {
    fields: [roomAvailability.periodId],
    references: [periods.id],
  }),
}));

export const facultySubjectsRelations = relations(facultySubjects, ({ one }) => ({
  faculty: one(faculty, {
    fields: [facultySubjects.facultyId],
    references: [faculty.id],
  }),
  subject: one(subjects, {
    fields: [facultySubjects.subjectId],
    references: [subjects.id],
  }),
}));

export const teachingRequirementsRelations = relations(teachingRequirements, ({ one }) => ({
  class: one(classes, {
    fields: [teachingRequirements.classId],
    references: [classes.id],
  }),
  subject: one(subjects, {
    fields: [teachingRequirements.subjectId],
    references: [subjects.id],
  }),
  faculty: one(faculty, {
    fields: [teachingRequirements.facultyId],
    references: [faculty.id],
  }),
  preferredRoom: one(classrooms, {
    fields: [teachingRequirements.preferredRoomId],
    references: [classrooms.id],
  }),
}));

export const coursesRelations = relations(courses, ({ many }) => ({
  classes: many(classes),
  subjects: many(subjects),
}));

export const academicYearsRelations = relations(academicYears, ({ many }) => ({
  semesters: many(semesters),
  classes: many(classes),
  timetableVersions: many(timetableVersions),
}));

export const semestersRelations = relations(semesters, ({ one, many }) => ({
  academicYear: one(academicYears, {
    fields: [semesters.academicYearId],
    references: [academicYears.id],
  }),
  classes: many(classes),
  subjects: many(subjects),
  timetableVersions: many(timetableVersions),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  course: one(courses, {
    fields: [classes.courseId],
    references: [courses.id],
  }),
  semester: one(semesters, {
    fields: [classes.semesterId],
    references: [semesters.id],
  }),
  academicYear: one(academicYears, {
    fields: [classes.academicYearId],
    references: [academicYears.id],
  }),
  requirements: many(teachingRequirements),
  timetableEntries: many(timetableEntries),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  course: one(courses, {
    fields: [subjects.courseId],
    references: [courses.id],
  }),
  semester: one(semesters, {
    fields: [subjects.semesterId],
    references: [semesters.id],
  }),
  facultySubjects: many(facultySubjects),
  requirements: many(teachingRequirements),
}));

export const classroomsRelations = relations(classrooms, ({ many }) => ({
  availability: many(roomAvailability),
  timetableEntries: many(timetableEntries),
}));

export const workingDaysRelations = relations(workingDays, ({ many }) => ({
  periods: many(timetableEntries),
}));

export const periodsRelations = relations(periods, ({ many }) => ({
  timetableEntries: many(timetableEntries),
}));

export const timetableVersionsRelations = relations(timetableVersions, ({ one, many }) => ({
  academicYear: one(academicYears, {
    fields: [timetableVersions.academicYearId],
    references: [academicYears.id],
  }),
  semester: one(semesters, {
    fields: [timetableVersions.semesterId],
    references: [semesters.id],
  }),
  generatedByUser: one(users, {
    fields: [timetableVersions.generatedByUserId],
    references: [users.id],
  }),
  entries: many(timetableEntries),
  conflictReports: many(conflictReports),
  solverRuns: many(solverRuns),
}));

export const timetableEntriesRelations = relations(timetableEntries, ({ one }) => ({
  version: one(timetableVersions, {
    fields: [timetableEntries.timetableVersionId],
    references: [timetableVersions.id],
  }),
  class: one(classes, {
    fields: [timetableEntries.classId],
    references: [classes.id],
  }),
  subject: one(subjects, {
    fields: [timetableEntries.subjectId],
    references: [subjects.id],
  }),
  faculty: one(faculty, {
    fields: [timetableEntries.facultyId],
    references: [faculty.id],
  }),
  classroom: one(classrooms, {
    fields: [timetableEntries.classroomId],
    references: [classrooms.id],
  }),
  day: one(workingDays, {
    fields: [timetableEntries.dayId],
    references: [workingDays.id],
  }),
  period: one(periods, {
    fields: [timetableEntries.periodId],
    references: [periods.id],
  }),
}));

export const solverRunsRelations = relations(solverRuns, ({ one }) => ({
  timetableVersion: one(timetableVersions, {
    fields: [solverRuns.timetableVersionId],
    references: [timetableVersions.id],
  }),
}));

export const conflictReportsRelations = relations(conflictReports, ({ one }) => ({
  timetableVersion: one(timetableVersions, {
    fields: [conflictReports.timetableVersionId],
    references: [timetableVersions.id],
  }),
  solverRun: one(solverRuns, {
    fields: [conflictReports.solverRunId],
    references: [solverRuns.id],
  }),
  period: one(periods, {
    fields: [conflictReports.periodId],
    references: [periods.id],
  }),
  day: one(workingDays, {
    fields: [conflictReports.dayId],
    references: [workingDays.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  faculty: one(faculty, {
    fields: [assignments.facultyId],
    references: [faculty.id],
  }),
  class: one(classes, {
    fields: [assignments.classId],
    references: [classes.id],
  }),
  subject: one(subjects, {
    fields: [assignments.subjectId],
    references: [subjects.id],
  }),
  academicYear: one(academicYears, {
    fields: [assignments.academicYearId],
    references: [academicYears.id],
  }),
  semester: one(semesters, {
    fields: [assignments.semesterId],
    references: [semesters.id],
  }),
}));

export const fixedSessionsRelations = relations(fixedSessions, ({ one }) => ({
  class: one(classes, {
    fields: [fixedSessions.classId],
    references: [classes.id],
  }),
  subject: one(subjects, {
    fields: [fixedSessions.subjectId],
    references: [subjects.id],
  }),
  faculty: one(faculty, {
    fields: [fixedSessions.facultyId],
    references: [faculty.id],
  }),
  classroom: one(classrooms, {
    fields: [fixedSessions.classroomId],
    references: [classrooms.id],
  }),
  day: one(workingDays, {
    fields: [fixedSessions.dayId],
    references: [workingDays.id],
  }),
  startPeriod: one(periods, {
    fields: [fixedSessions.startPeriodId],
    references: [periods.id],
  }),
}));
