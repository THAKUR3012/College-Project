import { eq, and, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "~/db/index.server";
import {
  faculty,
  users,
  roles,
  facultySubjects,
  facultyAvailability,
  subjects,
  auditLogs,
  timetableEntries,
} from "~/db/schema/index";

export async function getAllFaculty() {
  return db.query.faculty.findMany({
    with: {
      user: true,
      facultySubjects: {
        with: {
          subject: true,
        },
      },
    },
    orderBy: (f, { asc }) => [asc(f.fullName)],
  });
}

export async function getFacultyById(id: number) {
  return db.query.faculty.findFirst({
    where: eq(faculty.id, id),
    with: {
      user: true,
      facultySubjects: {
        with: {
          subject: true,
        },
      },
      availability: {
        with: {
          day: true,
          period: true,
        },
      },
    },
  });
}

export async function createFaculty(data: {
  fullName: string;
  email: string;
  employeeId: string;
  department: string;
  designation: string;
  maxWeeklyHours: number;
  maxConsecutiveHours: number;
  initialPassword?: string;
  subjectIds?: number[];
  adminUserId?: number;
}) {
  const password = data.initialPassword || "Faculty@123";
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Create user account
  const [userResult] = await db.insert(users).values({
    roleId: 3, // Faculty role
    username: data.email.split("@")[0],
    email: data.email.toLowerCase(),
    fullName: data.fullName,
    passwordHash,
    isActive: true,
  });

  const userId = userResult.insertId;

  // 2. Create faculty record
  const [facultyResult] = await db.insert(faculty).values({
    userId,
    employeeId: data.employeeId,
    fullName: data.fullName,
    email: data.email.toLowerCase(),
    department: data.department,
    designation: data.designation,
    maxWeeklyHours: data.maxWeeklyHours,
    maxConsecutiveHours: data.maxConsecutiveHours,
    isActive: true,
  });

  const newFacultyId = facultyResult.insertId;

  // 3. Link subjects if provided
  if (data.subjectIds && data.subjectIds.length > 0) {
    await db.insert(facultySubjects).values(
      data.subjectIds.map((subjId) => ({
        facultyId: newFacultyId,
        subjectId: subjId,
        isPrimary: true,
      }))
    );
  }

  // 4. Audit Log
  if (data.adminUserId) {
    await db.insert(auditLogs).values({
      userId: data.adminUserId,
      action: "FACULTY_CREATED",
      entityType: "faculty",
      entityId: newFacultyId,
      detailsJson: JSON.stringify({
        fullName: data.fullName,
        email: data.email,
        employeeId: data.employeeId,
      }),
    });
  }

  return newFacultyId;
}

export async function updateFaculty(
  id: number,
  data: {
    fullName?: string;
    email?: string;
    department?: string;
    designation?: string;
    maxWeeklyHours?: number;
    maxConsecutiveHours?: number;
    isActive?: boolean;
    subjectIds?: number[];
    adminUserId?: number;
  }
) {
  const existing = await db.query.faculty.findFirst({
    where: eq(faculty.id, id),
  });
  if (!existing) throw new Error("Faculty not found");

  await db
    .update(faculty)
    .set({
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
      ...(data.department !== undefined ? { department: data.department } : {}),
      ...(data.designation !== undefined ? { designation: data.designation } : {}),
      ...(data.maxWeeklyHours !== undefined ? { maxWeeklyHours: data.maxWeeklyHours } : {}),
      ...(data.maxConsecutiveHours !== undefined
        ? { maxConsecutiveHours: data.maxConsecutiveHours }
        : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    })
    .where(eq(faculty.id, id));

  // Update user name/email as well
  if (data.fullName || data.email) {
    await db
      .update(users)
      .set({
        ...(data.fullName ? { fullName: data.fullName } : {}),
        ...(data.email ? { email: data.email.toLowerCase() } : {}),
      })
      .where(eq(users.id, existing.userId));
  }

  // Update subjects if passed
  if (data.subjectIds) {
    await db.delete(facultySubjects).where(eq(facultySubjects.facultyId, id));
    if (data.subjectIds.length > 0) {
      await db.insert(facultySubjects).values(
        data.subjectIds.map((subjId) => ({
          facultyId: id,
          subjectId: subjId,
          isPrimary: true,
        }))
      );
    }
  }

  if (data.adminUserId) {
    await db.insert(auditLogs).values({
      userId: data.adminUserId,
      action: "FACULTY_UPDATED",
      entityType: "faculty",
      entityId: id,
      detailsJson: JSON.stringify(data),
    });
  }
}

export async function deleteFaculty(id: number, adminUserId?: number) {
  const existing = await db.query.faculty.findFirst({
    where: eq(faculty.id, id),
  });
  if (!existing) return;

  // Deleting user cascades to faculty
  await db.delete(users).where(eq(users.id, existing.userId));

  if (adminUserId) {
    await db.insert(auditLogs).values({
      userId: adminUserId,
      action: "FACULTY_DELETED",
      entityType: "faculty",
      entityId: id,
      detailsJson: JSON.stringify({ fullName: existing.fullName }),
    });
  }
}

export async function setFacultyAvailability(
  facultyId: number,
  dayId: number,
  periodId: number,
  status: "available" | "unavailable" | "preferred",
  reason?: string
) {
  await db
    .insert(facultyAvailability)
    .values({
      facultyId,
      dayId,
      periodId,
      status,
      reason,
    })
    .onDuplicateKeyUpdate({
      target: [
        facultyAvailability.facultyId,
        facultyAvailability.dayId,
        facultyAvailability.periodId,
      ],
      set: { status, reason },
    });
}
