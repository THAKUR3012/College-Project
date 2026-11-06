import { eq } from "drizzle-orm";
import { db } from "~/db/index.server";
import { subjects, courses, semesters, facultySubjects, auditLogs } from "~/db/schema/index";

export async function getAllSubjects() {
  return db.query.subjects.findMany({
    with: {
      course: true,
      semester: true,
      facultySubjects: {
        with: {
          faculty: true,
        },
      },
    },
    orderBy: (s, { asc }) => [asc(s.code)],
  });
}

export async function getSubjectById(id: number) {
  return db.query.subjects.findFirst({
    where: eq(subjects.id, id),
    with: {
      course: true,
      semester: true,
      facultySubjects: {
        with: {
          faculty: true,
        },
      },
    },
  });
}

export async function createSubject(data: {
  code: string;
  name: string;
  type: "theory" | "practical" | "seminar";
  weeklySessions: number;
  consecutiveSlotsRequired: number;
  requiredRoomType: "lecture" | "lab" | "seminar";
  colorCode?: string;
  courseId: number;
  semesterId: number;
  userId?: number;
}) {
  const [result] = await db.insert(subjects).values({
    code: data.code.toUpperCase(),
    name: data.name,
    type: data.type,
    weeklySessions: data.weeklySessions,
    consecutiveSlotsRequired: data.consecutiveSlotsRequired,
    requiredRoomType: data.requiredRoomType,
    colorCode: data.colorCode || "#3b82f6",
    courseId: data.courseId,
    semesterId: data.semesterId,
  });

  if (data.userId) {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: "SUBJECT_CREATED",
      entityType: "subject",
      entityId: result.insertId,
      detailsJson: JSON.stringify(data),
    });
  }

  return result.insertId;
}

export async function updateSubject(
  id: number,
  data: {
    code?: string;
    name?: string;
    type?: "theory" | "practical" | "seminar";
    weeklySessions?: number;
    consecutiveSlotsRequired?: number;
    requiredRoomType?: "lecture" | "lab" | "seminar";
    colorCode?: string;
    courseId?: number;
    semesterId?: number;
    userId?: number;
  }
) {
  await db
    .update(subjects)
    .set({
      ...(data.code ? { code: data.code.toUpperCase() } : {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.type ? { type: data.type } : {}),
      ...(data.weeklySessions !== undefined ? { weeklySessions: data.weeklySessions } : {}),
      ...(data.consecutiveSlotsRequired !== undefined
        ? { consecutiveSlotsRequired: data.consecutiveSlotsRequired }
        : {}),
      ...(data.requiredRoomType ? { requiredRoomType: data.requiredRoomType } : {}),
      ...(data.colorCode ? { colorCode: data.colorCode } : {}),
      ...(data.courseId ? { courseId: data.courseId } : {}),
      ...(data.semesterId ? { semesterId: data.semesterId } : {}),
    })
    .where(eq(subjects.id, id));

  if (data.userId) {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: "SUBJECT_UPDATED",
      entityType: "subject",
      entityId: id,
      detailsJson: JSON.stringify(data),
    });
  }
}

export async function deleteSubject(id: number, userId?: number) {
  await db.delete(subjects).where(eq(subjects.id, id));

  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: "SUBJECT_DELETED",
      entityType: "subject",
      entityId: id,
    });
  }
}
