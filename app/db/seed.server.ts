import bcrypt from "bcryptjs";
import { db, pool } from "./index.server";
import {
  roles,
  users,
  faculty,
  academicYears,
  semesters,
  courses,
  classes,
  subjects,
  facultySubjects,
  classrooms,
  workingDays,
  periods,
  breaks,
  facultyAvailability,
  roomAvailability,
  teachingRequirements,
  fixedSessions,
  assignments,
  timetableVersions,
  timetableEntries,
  solverRuns,
  conflictReports,
  auditLogs,
} from "./schema/index";
import { ne } from "drizzle-orm";

async function seed() {
  console.log("🌱 Initializing clean college timetable database foundation...");

  // 1. Clear any dummy data
  console.log("Removing all dummy records...");
  await db.delete(timetableEntries);
  await db.delete(conflictReports);
  await db.delete(solverRuns);
  await db.delete(timetableVersions);
  await db.delete(teachingRequirements);
  await db.delete(fixedSessions);
  await db.delete(assignments);
  await db.delete(facultyAvailability);
  await db.delete(roomAvailability);
  await db.delete(facultySubjects);
  await db.delete(classes);
  await db.delete(subjects);
  await db.delete(faculty);
  await db.delete(classrooms);
  await db.delete(users).where(ne(users.id, 1));
  await db.delete(auditLogs);

  // 2. Roles
  console.log("Configuring system roles...");
  await db
    .insert(roles)
    .values([
      { id: 1, name: "admin", description: "Administrator with full system control" },
      { id: 2, name: "coordinator", description: "Academic Coordinator managing schedules and curriculum" },
      { id: 3, name: "faculty", description: "Faculty member viewing personal timetables and workloads" },
    ])
    .onDuplicateKeyUpdate({ target: roles.id, set: { name: roles.name } });

  // 3. Official Admin Account
  console.log("Configuring administrator account...");
  const kesscAdminPassword = await bcrypt.hash("kes@101", 10);

  await db
    .insert(users)
    .values([
      {
        id: 1,
        roleId: 1,
        username: "kessc.edu.in",
        email: "admin@kessc.edu.in",
        fullName: "KES Shroff College Administrator",
        passwordHash: kesscAdminPassword,
        isActive: true,
      },
    ])
    .onDuplicateKeyUpdate({
      target: users.id,
      set: {
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
      },
    });

  // 4. Academic Year
  console.log("Configuring academic year...");
  await db
    .insert(academicYears)
    .values([
      {
        id: 1,
        name: "2026-2027",
        startDate: "2026-07-01",
        endDate: "2027-06-30",
        isCurrent: true,
      },
    ])
    .onDuplicateKeyUpdate({ target: academicYears.id, set: { name: academicYears.name } });

  // 5. Semesters
  console.log("Configuring semesters...");
  await db
    .insert(semesters)
    .values([
      { id: 1, academicYearId: 1, name: "Semester 1", number: 1, isActive: true },
      { id: 2, academicYearId: 1, name: "Semester 2", number: 2, isActive: true },
      { id: 3, academicYearId: 1, name: "Semester 3", number: 3, isActive: true },
      { id: 4, academicYearId: 1, name: "Semester 4", number: 4, isActive: true },
      { id: 5, academicYearId: 1, name: "Semester 5", number: 5, isActive: true },
      { id: 6, academicYearId: 1, name: "Semester 6", number: 6, isActive: true },
    ])
    .onDuplicateKeyUpdate({ target: semesters.id, set: { name: semesters.name } });

  // 6. Degree Programs / Courses
  console.log("Configuring degree programs...");
  await db
    .insert(courses)
    .values([
      {
        id: 1,
        code: "BCOM",
        name: "Bachelor of Commerce",
        department: "Commerce",
        totalSemesters: 6,
      },
      {
        id: 2,
        code: "BSCIT",
        name: "B.Sc. Information Technology",
        department: "Information Technology",
        totalSemesters: 6,
      },
      {
        id: 3,
        code: "BMS",
        name: "Bachelor of Management Studies",
        department: "Management Studies",
        totalSemesters: 6,
      },
      {
        id: 4,
        code: "BSCCS",
        name: "B.Sc. Computer Science",
        department: "Computer Science",
        totalSemesters: 6,
      },
      {
        id: 5,
        code: "BAF",
        name: "B.Com Accounting & Finance",
        department: "Accounting & Finance",
        totalSemesters: 6,
      },
      {
        id: 6,
        code: "BA",
        name: "Bachelor of Arts",
        department: "Arts & Humanities",
        totalSemesters: 6,
      },
    ])
    .onDuplicateKeyUpdate({ target: courses.id, set: { name: courses.name } });

  // 7. Working Days (Monday - Friday)
  console.log("Configuring working days...");
  await db
    .insert(workingDays)
    .values([
      { id: 1, dayName: "Monday", dayOrder: 1, isActive: true },
      { id: 2, dayName: "Tuesday", dayOrder: 2, isActive: true },
      { id: 3, dayName: "Wednesday", dayOrder: 3, isActive: true },
      { id: 4, dayName: "Thursday", dayOrder: 4, isActive: true },
      { id: 5, dayName: "Friday", dayOrder: 5, isActive: true },
    ])
    .onDuplicateKeyUpdate({ target: workingDays.id, set: { dayName: workingDays.dayName } });

  // 8. Periods (6 standard college periods)
  console.log("Configuring standard periods...");
  await db
    .insert(periods)
    .values([
      { id: 1, periodNumber: 1, name: "Period 1", startTime: "09:00:00", endTime: "10:00:00", isBreak: false },
      { id: 2, periodNumber: 2, name: "Period 2", startTime: "10:00:00", endTime: "11:00:00", isBreak: false },
      { id: 3, periodNumber: 3, name: "Period 3", startTime: "11:15:00", endTime: "12:15:00", isBreak: false },
      { id: 4, periodNumber: 4, name: "Period 4", startTime: "12:15:00", endTime: "13:15:00", isBreak: false },
      { id: 5, periodNumber: 5, name: "Period 5", startTime: "14:00:00", endTime: "15:00:00", isBreak: false },
      { id: 6, periodNumber: 6, name: "Period 6", startTime: "15:00:00", endTime: "16:00:00", isBreak: false },
    ])
    .onDuplicateKeyUpdate({ target: periods.id, set: { name: periods.name } });

  // 9. Breaks
  console.log("Configuring breaks...");
  await db
    .insert(breaks)
    .values([
      { id: 1, name: "Tea Break", afterPeriodNumber: 2, durationMinutes: 15 },
      { id: 2, name: "Lunch Break", afterPeriodNumber: 4, durationMinutes: 45 },
    ])
    .onDuplicateKeyUpdate({ target: breaks.id, set: { name: breaks.name } });

  console.log("✅ Database initialized cleanly without dummy records!");
  console.log("Authorized Administrator Login:");
  console.log("  Username: kessc.edu.in");
  console.log("  Password: kes@101");
}

seed()
  .catch((err) => {
    console.error("❌ Initialization failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });