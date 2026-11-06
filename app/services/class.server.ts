import { eq } from "drizzle-orm";
import { db } from "~/db/index.server";
import { classes, courses, semesters, academicYears, auditLogs } from "~/db/schema/index";

export async function getAllClasses() {
  return db.query.classes.findMany({
    with: {
      course: true,
      semester: true,
      academicYear: true,
      requirements: {
        with: {
          subject: true,
          faculty: true,
        },
      },
    },
    orderBy: (c, { asc }) => [asc(c.name)],
  });
}

export async function getClassById(id: number) {
  return db.query.classes.findFirst({
    where: eq(classes.id, id),
    with: {
      course: true,
      semester: true,
      academicYear: true,
      requirements: {
        with: {
          subject: true,
          faculty: true,
        },
      },
    },
  });
}

export async function createClass(data: {
  name: string;
  section: string;
  studentCount: number;
  courseId: number;
  semesterId: number;
  academicYearId: number;
  userId?: number;
}) {
  const [result] = await db.insert(classes).values({
    name: data.name,
    section: data.section,
    studentCount: data.studentCount,
    courseId: data.courseId,
    semesterId: data.semesterId,
    academicYearId: data.academicYearId,
  });

  if (data.userId) {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: "CLASS_CREATED",
      entityType: "class",
      entityId: result.insertId,
      detailsJson: JSON.stringify(data),
    });
  }

  return result.insertId;
}

export async function updateClass(
  id: number,
  data: {
    name?: string;
    section?: string;
    studentCount?: number;
    courseId?: number;
    semesterId?: number;
    academicYearId?: number;
    userId?: number;
  }
) {
  await db
    .update(classes)
    .set({
      ...(data.name ? { name: data.name } : {}),
      ...(data.section ? { section: data.section } : {}),
      ...(data.studentCount !== undefined ? { studentCount: data.studentCount } : {}),
      ...(data.courseId ? { courseId: data.courseId } : {}),
      ...(data.semesterId ? { semesterId: data.semesterId } : {}),
      ...(data.academicYearId ? { academicYearId: data.academicYearId } : {}),
    })
    .where(eq(classes.id, id));

  if (data.userId) {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: "CLASS_UPDATED",
      entityType: "class",
      entityId: id,
      detailsJson: JSON.stringify(data),
    });
  }
}

export async function deleteClass(id: number, userId?: number) {
  await db.delete(classes).where(eq(classes.id, id));

  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: "CLASS_DELETED",
      entityType: "class",
      entityId: id,
    });
  }
}
