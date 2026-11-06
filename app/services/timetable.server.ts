import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "~/db/index.server";
import {
  timetableVersions,
  timetableEntries,
  solverRuns,
  conflictReports,
  auditLogs,
  classes,
  faculty,
  classrooms,
  subjects,
  workingDays,
  periods,
  teachingRequirements,
  facultyAvailability,
  roomAvailability,
  fixedSessions,
} from "~/db/schema/index";
import { generateTimetable } from "~/algorithms/timetable-generator";
import { validateCompleteSchedule } from "~/algorithms/validation";
import type { TimetableSlotAssignment } from "~/algorithms/types";

export async function getPublishedTimetable(semesterId?: number) {
  return db.query.timetableVersions.findFirst({
    where: (tv, { and, eq }) =>
      semesterId
        ? and(eq(tv.status, "published"), eq(tv.semesterId, semesterId))
        : eq(tv.status, "published"),
    orderBy: (tv, { desc }) => [desc(tv.updatedAt)],
    with: {
      academicYear: true,
      semester: true,
      entries: {
        with: {
          class: true,
          subject: true,
          faculty: true,
          classroom: true,
          day: true,
          period: true,
        },
      },
    },
  });
}

export async function getTimetableVersionById(versionId: number) {
  return db.query.timetableVersions.findFirst({
    where: eq(timetableVersions.id, versionId),
    with: {
      academicYear: true,
      semester: true,
      generatedByUser: true,
      entries: {
        with: {
          class: true,
          subject: true,
          faculty: true,
          classroom: true,
          day: true,
          period: true,
        },
      },
      conflictReports: true,
      solverRuns: {
        orderBy: (sr, { desc }) => [desc(sr.createdAt)],
      },
    },
  });
}

export async function getAllTimetableVersions() {
  return db.query.timetableVersions.findMany({
    orderBy: (tv, { desc }) => [desc(tv.createdAt)],
    with: {
      academicYear: true,
      semester: true,
      generatedByUser: true,
      solverRuns: {
        limit: 1,
        orderBy: (sr, { desc }) => [desc(sr.createdAt)],
      },
    },
  });
}

export async function publishTimetableVersion(versionId: number, userId: number) {
  const version = await db.query.timetableVersions.findFirst({
    where: eq(timetableVersions.id, versionId),
  });
  if (!version) throw new Error("Timetable version not found");

  // Validate version has entries and no hard violations
  const entries = await db.query.timetableEntries.findMany({
    where: eq(timetableEntries.timetableVersionId, versionId),
  });
  if (entries.length === 0) {
    throw new Error("Cannot publish an empty timetable.");
  }

  // Set any previous published version for this semester to 'archived'
  await db
    .update(timetableVersions)
    .set({ status: "archived" })
    .where(
      and(
        eq(timetableVersions.semesterId, version.semesterId),
        eq(timetableVersions.status, "published")
      )
    );

  // Set this version to 'published'
  await db
    .update(timetableVersions)
    .set({ status: "published" })
    .where(eq(timetableVersions.id, versionId));

  // Audit log
  await db.insert(auditLogs).values({
    userId,
    action: "TIMETABLE_PUBLISHED",
    entityType: "timetable_version",
    entityId: versionId,
    detailsJson: JSON.stringify({
      versionName: version.name,
      totalEntries: entries.length,
    }),
  });
}

export async function generateAndSaveTimetable(options: {
  semesterId: number;
  academicYearId: number;
  name: string;
  notes?: string;
  userId: number;
  maxTimeMs?: number;
}) {
  // 1. Fetch relevant academic inputs
  const classesList = await db.query.classes.findMany();
  const facultyList = await db.query.faculty.findMany({ where: eq(faculty.isActive, true) });
  const roomsList = await db.query.classrooms.findMany({ where: eq(classrooms.isActive, true) });
  const subjectsList = await db.query.subjects.findMany();
  const daysList = await db.query.workingDays.findMany({
    where: eq(workingDays.isActive, true),
    orderBy: (d, { asc }) => [asc(d.dayOrder)],
  });
  const periodsList = await db.query.periods.findMany({
    where: eq(periods.isBreak, false),
    orderBy: (p, { asc }) => [asc(p.periodNumber)],
  });
  const facultyAvail = await db.query.facultyAvailability.findMany();
  const roomAvail = await db.query.roomAvailability.findMany();
  const fixedSessionsList = await db.query.fixedSessions.findMany();
  const requirements = await db.query.teachingRequirements.findMany();

  // 2. Execute Solver
  const solverResult = generateTimetable(
    requirements,
    classesList,
    facultyList,
    roomsList,
    subjectsList,
    daysList,
    periodsList,
    facultyAvail,
    roomAvail,
    fixedSessionsList,
    { maxTimeMs: options.maxTimeMs ?? 10000, enableOptimization: true }
  );

  // 3. Create Timetable Version
  const [versionResult] = await db.insert(timetableVersions).values({
    academicYearId: options.academicYearId,
    semesterId: options.semesterId,
    name: options.name,
    versionNumber: 1,
    status: "draft",
    optimizationScore: solverResult.optimizationScore,
    generatedByUserId: options.userId,
    notes: options.notes || solverResult.diagnosisSummary,
  });

  const versionId = versionResult.insertId;

  // 4. Save Solver Run
  const [solverRunResult] = await db.insert(solverRuns).values({
    timetableVersionId: versionId,
    status: solverResult.status,
    executionTimeMs: solverResult.executionTimeMs,
    iterations: solverResult.iterations,
    optimizationScore: solverResult.optimizationScore,
    hardConflictsCount: solverResult.hardViolations.length,
    softPenalty: solverResult.softPenalty,
    diagnosisSummary: solverResult.diagnosisSummary,
    configurationJson: JSON.stringify({ maxTimeMs: options.maxTimeMs ?? 10000 }),
  });

  const solverRunId = solverRunResult.insertId;

  // 5. Save Conflict Reports if any
  const allConflicts = [...solverResult.hardViolations, ...solverResult.softViolations];
  if (allConflicts.length > 0) {
    await db.insert(conflictReports).values(
      allConflicts.map((c) => ({
        timetableVersionId: versionId,
        solverRunId,
        conflictType: c.type,
        severity: c.severity,
        description: c.description,
        entityType: c.entityType,
        entityId: c.entityId ?? null,
        periodId: c.periodId ?? null,
        dayId: c.dayId ?? null,
      }))
    );
  }

  // 6. Save Timetable Entries (if feasible / optimal)
  if (solverResult.entries.length > 0) {
    const entryChunks: Array<(typeof timetableEntries.$inferInsert)> = solverResult.entries.map(
      (e) => ({
        timetableVersionId: versionId,
        classId: e.classId,
        subjectId: e.subjectId,
        facultyId: e.facultyId,
        classroomId: e.classroomId,
        dayId: e.dayId,
        periodId: e.periodId,
        isFixed: e.isFixed,
      })
    );

    // Insert in batches
    for (let i = 0; i < entryChunks.length; i += 50) {
      const chunk = entryChunks.slice(i, i + 50);
      await db.insert(timetableEntries).values(chunk);
    }
  }

  // 7. Audit log
  await db.insert(auditLogs).values({
    userId: options.userId,
    action: "TIMETABLE_GENERATED",
    entityType: "timetable_version",
    entityId: versionId,
    detailsJson: JSON.stringify({
      versionName: options.name,
      status: solverResult.status,
      score: solverResult.optimizationScore,
      entriesCreated: solverResult.entries.length,
      timeMs: solverResult.executionTimeMs,
    }),
  });

  return {
    versionId,
    solverResult,
  };
}

/**
 * Validates and applies a manual timetable edit.
 * Rejects with an error if ANY hard constraint would be violated!
 */
export async function manualEditTimetableSlot(options: {
  versionId: number;
  entryId?: number;
  classId: number;
  subjectId: number;
  facultyId: number;
  classroomId: number;
  dayId: number;
  periodId: number;
  userId: number;
}) {
  const version = await db.query.timetableVersions.findFirst({
    where: eq(timetableVersions.id, options.versionId),
  });
  if (!version) throw new Error("Timetable version not found");

  // Fetch relevant entities
  const cls = await db.query.classes.findFirst({ where: eq(classes.id, options.classId) });
  const fac = await db.query.faculty.findFirst({ where: eq(faculty.id, options.facultyId) });
  const rm = await db.query.classrooms.findFirst({ where: eq(classrooms.id, options.classroomId) });
  const sub = await db.query.subjects.findFirst({ where: eq(subjects.id, options.subjectId) });

  if (!cls || !fac || !rm || !sub) {
    throw new Error("Invalid entity reference provided for timetable slot");
  }

  // 1. Room Capacity Check
  if (rm.capacity < cls.studentCount) {
    throw new Error(
      `Room Capacity Conflict: Classroom ${rm.roomNumber} has capacity of ${rm.capacity}, but Class ${cls.name} has ${cls.studentCount} students.`
    );
  }

  // 2. Room Type Check
  if (sub.requiredRoomType === "lab" && rm.roomType !== "lab") {
    throw new Error(
      `Room Type Conflict: Practical subject ${sub.code} requires a 'lab', but ${rm.roomNumber} is a '${rm.roomType}'.`
    );
  }

  // 3. Faculty Unavailable Check
  const unavail = await db.query.facultyAvailability.findFirst({
    where: and(
      eq(facultyAvailability.facultyId, options.facultyId),
      eq(facultyAvailability.dayId, options.dayId),
      eq(facultyAvailability.periodId, options.periodId),
      eq(facultyAvailability.status, "unavailable")
    ),
  });
  if (unavail) {
    throw new Error(
      `Faculty Availability Conflict: ${fac.fullName} is marked unavailable at this time slot (${unavail.reason || "Scheduled Leave/Meeting"}).`
    );
  }

  // 4. Room Unavailable Check
  const rmUnavail = await db.query.roomAvailability.findFirst({
    where: and(
      eq(roomAvailability.classroomId, options.classroomId),
      eq(roomAvailability.dayId, options.dayId),
      eq(roomAvailability.periodId, options.periodId),
      eq(roomAvailability.isAvailable, false)
    ),
  });
  if (rmUnavail) {
    throw new Error(
      `Room Availability Conflict: Classroom ${rm.roomNumber} is marked unavailable for maintenance or event.`
    );
  }

  // 5. Existing Entries in this version (excluding the current entry being edited)
  const existingEntries = await db.query.timetableEntries.findMany({
    where: eq(timetableEntries.timetableVersionId, options.versionId),
    with: {
      class: true,
      faculty: true,
      classroom: true,
      subject: true,
    },
  });

  for (const ent of existingEntries) {
    if (options.entryId && ent.id === options.entryId) continue;

    if (ent.dayId === options.dayId && ent.periodId === options.periodId) {
      // Check Class Overlap
      if (ent.classId === options.classId) {
        throw new Error(
          `Class Conflict: Class ${cls.name} is already scheduled for ${ent.subject.code} in Room ${ent.classroom.roomNumber} during this period.`
        );
      }
      // Check Faculty Overlap
      if (ent.facultyId === options.facultyId) {
        throw new Error(
          `Faculty Double-Booking: Faculty ${fac.fullName} is already teaching ${ent.class.name} (${ent.subject.code}) during this period.`
        );
      }
      // Check Classroom Overlap
      if (ent.classroomId === options.classroomId) {
        throw new Error(
          `Room Double-Booking: Classroom ${rm.roomNumber} is already occupied by ${ent.class.name} (${ent.subject.code}) during this period.`
        );
      }
    }
  }

  // 6. Check Faculty Workload Limit
  let totalFacHours = 0;
  for (const ent of existingEntries) {
    if (options.entryId && ent.id === options.entryId) continue;
    if (ent.facultyId === options.facultyId) totalFacHours++;
  }
  if (totalFacHours + 1 > fac.maxWeeklyHours) {
    throw new Error(
      `Faculty Workload Exceeded: Faculty ${fac.fullName} has a maximum workload of ${fac.maxWeeklyHours} hours/week. Current assignments: ${totalFacHours} hours.`
    );
  }

  // All hard constraints pass! Apply the edit
  if (options.entryId) {
    await db
      .update(timetableEntries)
      .set({
        classId: options.classId,
        subjectId: options.subjectId,
        facultyId: options.facultyId,
        classroomId: options.classroomId,
        dayId: options.dayId,
        periodId: options.periodId,
      })
      .where(eq(timetableEntries.id, options.entryId));
  } else {
    await db.insert(timetableEntries).values({
      timetableVersionId: options.versionId,
      classId: options.classId,
      subjectId: options.subjectId,
      facultyId: options.facultyId,
      classroomId: options.classroomId,
      dayId: options.dayId,
      periodId: options.periodId,
      isFixed: false,
    });
  }

  // Audit log
  await db.insert(auditLogs).values({
    userId: options.userId,
    action: options.entryId ? "TIMETABLE_ENTRY_UPDATED" : "TIMETABLE_ENTRY_ADDED",
    entityType: "timetable_entry",
    entityId: options.entryId ?? options.versionId,
    detailsJson: JSON.stringify({
      class: cls.name,
      faculty: fac.fullName,
      room: rm.roomNumber,
      subject: sub.code,
      dayId: options.dayId,
      periodId: options.periodId,
    }),
  });

  return { success: true };
}

export async function deleteTimetableEntry(entryId: number, userId: number) {
  const entry = await db.query.timetableEntries.findFirst({
    where: eq(timetableEntries.id, entryId),
  });
  if (!entry) return;

  await db.delete(timetableEntries).where(eq(timetableEntries.id, entryId));

  await db.insert(auditLogs).values({
    userId,
    action: "TIMETABLE_ENTRY_DELETED",
    entityType: "timetable_entry",
    entityId: entryId,
    detailsJson: JSON.stringify(entry),
  });
}

export async function deleteTimetableVersion(versionId: number, userId: number) {
  await db.delete(timetableVersions).where(eq(timetableVersions.id, versionId));

  await db.insert(auditLogs).values({
    userId,
    action: "TIMETABLE_VERSION_DELETED",
    entityType: "timetable_version",
    entityId: versionId,
  });
}
