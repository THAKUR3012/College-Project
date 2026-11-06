import { eq, and } from "drizzle-orm";
import { db } from "~/db/index.server";
import {
  faculty,
  timetableEntries,
  timetableVersions,
  classrooms,
  classes,
  subjects,
  workingDays,
  periods,
} from "~/db/schema/index";

export async function getFacultyWorkloadAnalytics(timetableVersionId?: number) {
  // If no version specified, pick the published one or the latest draft
  let versionId = timetableVersionId;
  if (!versionId) {
    const published = await db.query.timetableVersions.findFirst({
      where: eq(timetableVersions.status, "published"),
      orderBy: (tv, { desc }) => [desc(tv.updatedAt)],
    });
    if (published) {
      versionId = published.id;
    } else {
      const latest = await db.query.timetableVersions.findFirst({
        orderBy: (tv, { desc }) => [desc(tv.createdAt)],
      });
      versionId = latest?.id;
    }
  }

  const allFaculty = await db.query.faculty.findMany({
    where: eq(faculty.isActive, true),
    orderBy: (f, { asc }) => [asc(f.fullName)],
  });

  const allRooms = await db.query.classrooms.findMany({
    where: eq(classrooms.isActive, true),
    orderBy: (r, { asc }) => [asc(r.roomNumber)],
  });

  const allDays = await db.query.workingDays.findMany({
    where: eq(workingDays.isActive, true),
    orderBy: (d, { asc }) => [asc(d.dayOrder)],
  });

  const allPeriods = await db.query.periods.findMany({
    where: eq(periods.isBreak, false),
  });

  const totalWeeklyPeriodsPerRoom = allDays.length * allPeriods.length;

  const entries = versionId
    ? await db.query.timetableEntries.findMany({
        where: eq(timetableEntries.timetableVersionId, versionId),
        with: {
          class: true,
          subject: true,
          faculty: true,
          classroom: true,
          day: true,
          period: true,
        },
      })
    : [];

  // 1. Compute faculty metrics
  const facultyStats = allFaculty.map((fac) => {
    const facEntries = entries.filter((e) => e.facultyId === fac.id);
    const assignedHours = facEntries.length;
    const maxHours = fac.maxWeeklyHours;
    const utilizationRate = maxHours > 0 ? Math.round((assignedHours / maxHours) * 100) : 0;

    // Daily distribution
    const dayDistribution: Record<string, number> = {};
    for (const d of allDays) {
      dayDistribution[d.dayName] = facEntries.filter((e) => e.dayId === d.id).length;
    }

    // Subject breakdown
    const subjectBreakdownMap = new Map<string, { code: string; name: string; hours: number }>();
    for (const e of facEntries) {
      const code = e.subject.code;
      if (!subjectBreakdownMap.has(code)) {
        subjectBreakdownMap.set(code, {
          code,
          name: e.subject.name,
          hours: 0,
        });
      }
      subjectBreakdownMap.get(code)!.hours++;
    }

    let statusBadge: "under_allocated" | "optimal" | "near_capacity" | "over_capacity" = "optimal";
    if (assignedHours > maxHours) {
      statusBadge = "over_capacity";
    } else if (utilizationRate >= 90) {
      statusBadge = "near_capacity";
    } else if (utilizationRate < 50) {
      statusBadge = "under_allocated";
    }

    return {
      facultyId: fac.id,
      fullName: fac.fullName,
      employeeId: fac.employeeId,
      department: fac.department,
      designation: fac.designation,
      assignedHours,
      maxWeeklyHours: maxHours,
      utilizationRate,
      statusBadge,
      dayDistribution,
      subjectBreakdown: Array.from(subjectBreakdownMap.values()),
      entriesCount: facEntries.length,
    };
  });

  // 2. Compute room utilization metrics
  const roomStats = allRooms.map((rm) => {
    const rmEntries = entries.filter((e) => e.classroomId === rm.id);
    const occupiedPeriods = rmEntries.length;
    const utilizationRate =
      totalWeeklyPeriodsPerRoom > 0
        ? Math.round((occupiedPeriods / totalWeeklyPeriodsPerRoom) * 100)
        : 0;

    return {
      roomId: rm.id,
      roomNumber: rm.roomNumber,
      capacity: rm.capacity,
      roomType: rm.roomType,
      building: rm.building,
      occupiedPeriods,
      totalSlots: totalWeeklyPeriodsPerRoom,
      utilizationRate,
    };
  });

  // 3. Departmental aggregate
  const deptMap = new Map<string, { totalHours: number; facultyCount: number }>();
  for (const fs of facultyStats) {
    if (!deptMap.has(fs.department)) {
      deptMap.set(fs.department, { totalHours: 0, facultyCount: 0 });
    }
    const d = deptMap.get(fs.department)!;
    d.totalHours += fs.assignedHours;
    d.facultyCount += 1;
  }

  const departmentStats = Array.from(deptMap.entries()).map(([dept, data]) => ({
    department: dept,
    totalAssignedHours: data.totalHours,
    facultyCount: data.facultyCount,
    averageHoursPerFaculty:
      data.facultyCount > 0 ? Math.round((data.totalHours / data.facultyCount) * 10) / 10 : 0,
  }));

  return {
    versionId,
    facultyStats,
    roomStats,
    departmentStats,
    totalAssignedSessions: entries.length,
    allDays,
  };
}
