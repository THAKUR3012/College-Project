import { eq } from "drizzle-orm";
import { db } from "~/db/index.server";
import { classrooms, roomAvailability, auditLogs, timetableEntries } from "~/db/schema/index";

export async function getAllClassrooms() {
  return db.query.classrooms.findMany({
    with: {
      availability: true,
    },
    orderBy: (c, { asc }) => [asc(c.roomNumber)],
  });
}

export async function getClassroomById(id: number) {
  return db.query.classrooms.findFirst({
    where: eq(classrooms.id, id),
    with: {
      availability: {
        with: {
          day: true,
          period: true,
        },
      },
    },
  });
}

export async function createClassroom(data: {
  roomNumber: string;
  building: string;
  floor: number;
  capacity: number;
  roomType: "lecture" | "lab" | "seminar";
  isActive?: boolean;
  userId?: number;
}) {
  const [result] = await db.insert(classrooms).values({
    roomNumber: data.roomNumber.toUpperCase(),
    building: data.building,
    floor: data.floor,
    capacity: data.capacity,
    roomType: data.roomType,
    isActive: data.isActive ?? true,
  });

  if (data.userId) {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: "ROOM_CREATED",
      entityType: "classroom",
      entityId: result.insertId,
      detailsJson: JSON.stringify(data),
    });
  }

  return result.insertId;
}

export async function updateClassroom(
  id: number,
  data: {
    roomNumber?: string;
    building?: string;
    floor?: number;
    capacity?: number;
    roomType?: "lecture" | "lab" | "seminar";
    isActive?: boolean;
    userId?: number;
  }
) {
  await db
    .update(classrooms)
    .set({
      ...(data.roomNumber ? { roomNumber: data.roomNumber.toUpperCase() } : {}),
      ...(data.building ? { building: data.building } : {}),
      ...(data.floor !== undefined ? { floor: data.floor } : {}),
      ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      ...(data.roomType ? { roomType: data.roomType } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    })
    .where(eq(classrooms.id, id));

  if (data.userId) {
    await db.insert(auditLogs).values({
      userId: data.userId,
      action: "ROOM_UPDATED",
      entityType: "classroom",
      entityId: id,
      detailsJson: JSON.stringify(data),
    });
  }
}

export async function deleteClassroom(id: number, userId?: number) {
  await db.delete(classrooms).where(eq(classrooms.id, id));

  if (userId) {
    await db.insert(auditLogs).values({
      userId,
      action: "ROOM_DELETED",
      entityType: "classroom",
      entityId: id,
    });
  }
}

export async function setRoomAvailability(
  classroomId: number,
  dayId: number,
  periodId: number,
  isAvailable: boolean,
  reason?: string
) {
  await db
    .insert(roomAvailability)
    .values({
      classroomId,
      dayId,
      periodId,
      isAvailable,
      reason,
    })
    .onDuplicateKeyUpdate({
      target: [
        roomAvailability.classroomId,
        roomAvailability.dayId,
        roomAvailability.periodId,
      ],
      set: { isAvailable, reason },
    });
}
