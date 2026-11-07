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
  auditLogs,
} from "./schema/index";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting automated timetable system database seeding...");

  // 1. Roles
  console.log("Creating roles...");
  await db.insert(roles).values([
    { id: 1, name: "admin", description: "Administrator with full system control" },
    { id: 2, name: "coordinator", description: "Academic Coordinator managing schedules and curriculum" },
    { id: 3, name: "faculty", description: "Faculty member viewing personal timetables and workloads" },
  ]).onDuplicateKeyUpdate({ target: roles.id, set: { name: roles.name } });

  // 2. Users
  console.log("Creating users...");
  const kesscAdminPassword = await bcrypt.hash("kes@101", 10);
  const disabledPassword = "DISABLED_ACCOUNT";

  // Single active login user (admin) and inactive faculty profiles
  await db.insert(users).values([
    {
      id: 1,
      roleId: 1,
      username: "kessc.edu.in",
      email: "admin@kessc.edu.in",
      fullName: "KES Shroff College Administrator",
      passwordHash: kesscAdminPassword,
      isActive: true,
    },
    {
      id: 2,
      roleId: 2,
      username: "coordinator",
      email: "coordinator@college.edu",
      fullName: "Prof. Neha Kapoor (Timetable Coordinator)",
      passwordHash: disabledPassword,
      isActive: false,
    },
    {
      id: 3,
      roleId: 3,
      username: "dr.sharma",
      email: "dr.sharma@college.edu",
      fullName: "Dr. Rajesh Sharma",
      passwordHash: disabledPassword,
      isActive: false,
    },
    {
      id: 4,
      roleId: 3,
      username: "dr.anita",
      email: "dr.anita@college.edu",
      fullName: "Dr. Anita Verma",
      passwordHash: disabledPassword,
      isActive: false,
    },
    {
      id: 5,
      roleId: 3,
      username: "prof.vikram",
      email: "prof.vikram@college.edu",
      fullName: "Prof. Vikram Malhotra",
      passwordHash: disabledPassword,
      isActive: false,
    },
    {
      id: 6,
      roleId: 3,
      username: "prof.priya",
      email: "prof.priya@college.edu",
      fullName: "Prof. Priya Nambiar",
      passwordHash: disabledPassword,
      isActive: false,
    },
    {
      id: 7,
      roleId: 3,
      username: "prof.rahul",
      email: "prof.rahul@college.edu",
      fullName: "Prof. Rahul Sen",
      passwordHash: disabledPassword,
      isActive: false,
    },
    {
      id: 8,
      roleId: 3,
      username: "dr.sunita",
      email: "dr.sunita@college.edu",
      fullName: "Dr. Sunita Rao",
      passwordHash: disabledPassword,
      isActive: false,
    },
  ]).onDuplicateKeyUpdate({
    target: users.id,
    set: {
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      passwordHash: users.passwordHash,
      isActive: users.isActive,
    },
  });

  // 3. Faculty details
  console.log("Creating faculty profiles...");
  await db.insert(faculty).values([
    {
      id: 1,
      userId: 3,
      employeeId: "FAC-CS-001",
      fullName: "Dr. Rajesh Sharma",
      email: "dr.sharma@college.edu",
      department: "Computer Science",
      designation: "Professor & HOD",
      maxWeeklyHours: 18,
      maxConsecutiveHours: 3,
      isActive: true,
    },
    {
      id: 2,
      userId: 4,
      employeeId: "FAC-CS-002",
      fullName: "Dr. Anita Verma",
      email: "dr.anita@college.edu",
      department: "Computer Science",
      designation: "Associate Professor",
      maxWeeklyHours: 20,
      maxConsecutiveHours: 3,
      isActive: true,
    },
    {
      id: 3,
      userId: 5,
      employeeId: "FAC-CS-003",
      fullName: "Prof. Vikram Malhotra",
      email: "prof.vikram@college.edu",
      department: "Computer Science",
      designation: "Assistant Professor",
      maxWeeklyHours: 22,
      maxConsecutiveHours: 3,
      isActive: true,
    },
    {
      id: 4,
      userId: 6,
      employeeId: "FAC-CS-004",
      fullName: "Prof. Priya Nambiar",
      email: "prof.priya@college.edu",
      department: "Computer Science",
      designation: "Assistant Professor",
      maxWeeklyHours: 20,
      maxConsecutiveHours: 3,
      isActive: true,
    },
    {
      id: 5,
      userId: 7,
      employeeId: "FAC-MATH-005",
      fullName: "Prof. Rahul Sen",
      email: "prof.rahul@college.edu",
      department: "Mathematics",
      designation: "Assistant Professor",
      maxWeeklyHours: 18,
      maxConsecutiveHours: 3,
      isActive: true,
    },
    {
      id: 6,
      userId: 8,
      employeeId: "FAC-EC-006",
      fullName: "Dr. Sunita Rao",
      email: "dr.sunita@college.edu",
      department: "Electronics & Comm",
      designation: "Associate Professor",
      maxWeeklyHours: 18,
      maxConsecutiveHours: 3,
      isActive: true,
    },
  ]).onDuplicateKeyUpdate({ target: faculty.id, set: { fullName: faculty.fullName } });

  // 4. Academic Years
  console.log("Creating academic year and semesters...");
  await db.insert(academicYears).values([
    {
      id: 1,
      name: "2025-2026",
      startDate: "2025-07-01",
      endDate: "2026-06-30",
      isCurrent: true,
    },
  ]).onDuplicateKeyUpdate({ target: academicYears.id, set: { name: academicYears.name } });

  // 5. Semesters
  await db.insert(semesters).values([
    {
      id: 1,
      academicYearId: 1,
      name: "Fall Semester 2025 (Odd)",
      number: 3,
      isActive: true,
    },
    {
      id: 2,
      academicYearId: 1,
      name: "Fall Semester 2025 (Odd)",
      number: 5,
      isActive: true,
    },
  ]).onDuplicateKeyUpdate({ target: semesters.id, set: { name: semesters.name } });

  // 6. Courses
  console.log("Creating course and classes...");
  await db.insert(courses).values([
    {
      id: 1,
      code: "BTECH-CSE",
      name: "B.Tech Computer Science and Engineering",
      department: "Computer Science",
      totalSemesters: 8,
    },
  ]).onDuplicateKeyUpdate({ target: courses.id, set: { name: courses.name } });

  // 7. Classes (3 Classes as required by Acceptance Demonstration)
  await db.insert(classes).values([
    {
      id: 1,
      courseId: 1,
      academicYearId: 1,
      semesterId: 1,
      name: "CSE-3A",
      section: "A",
      studentCount: 55,
    },
    {
      id: 2,
      courseId: 1,
      academicYearId: 1,
      semesterId: 1,
      name: "CSE-3B",
      section: "B",
      studentCount: 50,
    },
    {
      id: 3,
      courseId: 1,
      academicYearId: 1,
      semesterId: 2,
      name: "CSE-5A",
      section: "A",
      studentCount: 45,
    },
  ]).onDuplicateKeyUpdate({ target: classes.id, set: { name: classes.name } });

  // 8. Classrooms (4 Classrooms as required)
  console.log("Creating classrooms...");
  await db.insert(classrooms).values([
    {
      id: 1,
      roomNumber: "LH-101",
      building: "CS Block",
      floor: 1,
      capacity: 70,
      roomType: "lecture",
      isActive: true,
    },
    {
      id: 2,
      roomNumber: "LH-102",
      building: "CS Block",
      floor: 1,
      capacity: 65,
      roomType: "lecture",
      isActive: true,
    },
    {
      id: 3,
      roomNumber: "LAB-1",
      building: "CS Block",
      floor: 2,
      capacity: 60,
      roomType: "lab",
      isActive: true,
    },
    {
      id: 4,
      roomNumber: "SEMINAR-A",
      building: "Academic Complex",
      floor: 3,
      capacity: 80,
      roomType: "seminar",
      isActive: true,
    },
  ]).onDuplicateKeyUpdate({ target: classrooms.id, set: { roomNumber: classrooms.roomNumber } });

  // 9. Working Days (5 working days)
  console.log("Creating working days and periods...");
  await db.insert(workingDays).values([
    { id: 1, dayName: "Monday", dayOrder: 1, isActive: true },
    { id: 2, dayName: "Tuesday", dayOrder: 2, isActive: true },
    { id: 3, dayName: "Wednesday", dayOrder: 3, isActive: true },
    { id: 4, dayName: "Thursday", dayOrder: 4, isActive: true },
    { id: 5, dayName: "Friday", dayOrder: 5, isActive: true },
  ]).onDuplicateKeyUpdate({ target: workingDays.id, set: { dayName: workingDays.dayName } });

  // 10. Periods (6 standard teaching periods)
  await db.insert(periods).values([
    { id: 1, periodNumber: 1, name: "Period 1", startTime: "09:00:00", endTime: "10:00:00", isBreak: false },
    { id: 2, periodNumber: 2, name: "Period 2", startTime: "10:00:00", endTime: "11:00:00", isBreak: false },
    { id: 3, periodNumber: 3, name: "Period 3", startTime: "11:15:00", endTime: "12:15:00", isBreak: false },
    { id: 4, periodNumber: 4, name: "Period 4", startTime: "12:15:00", endTime: "13:15:00", isBreak: false },
    { id: 5, periodNumber: 5, name: "Period 5", startTime: "14:00:00", endTime: "15:00:00", isBreak: false },
    { id: 6, periodNumber: 6, name: "Period 6", startTime: "15:00:00", endTime: "16:00:00", isBreak: false },
  ]).onDuplicateKeyUpdate({ target: periods.id, set: { name: periods.name } });

  // 11. Breaks
  await db.insert(breaks).values([
    { id: 1, name: "Tea Break", afterPeriodNumber: 2, durationMinutes: 15 },
    { id: 2, name: "Lunch Break", afterPeriodNumber: 4, durationMinutes: 45 },
  ]).onDuplicateKeyUpdate({ target: breaks.id, set: { name: breaks.name } });

  // 12. Subjects
  console.log("Creating subjects...");
  await db.insert(subjects).values([
    {
      id: 1,
      courseId: 1,
      semesterId: 1,
      code: "CS301",
      name: "Data Structures & Algorithms",
      type: "theory",
      weeklySessions: 4,
      consecutiveSlotsRequired: 1,
      requiredRoomType: "lecture",
      colorCode: "#3b82f6",
    },
    {
      id: 2,
      courseId: 1,
      semesterId: 1,
      code: "CS302",
      name: "Discrete Mathematics",
      type: "theory",
      weeklySessions: 4,
      consecutiveSlotsRequired: 1,
      requiredRoomType: "lecture",
      colorCode: "#8b5cf6",
    },
    {
      id: 3,
      courseId: 1,
      semesterId: 1,
      code: "CS303",
      name: "Computer Organization",
      type: "theory",
      weeklySessions: 3,
      consecutiveSlotsRequired: 1,
      requiredRoomType: "lecture",
      colorCode: "#06b6d4",
    },
    {
      id: 4,
      courseId: 1,
      semesterId: 1,
      code: "CS304",
      name: "Data Structures Lab",
      type: "practical",
      weeklySessions: 2,
      consecutiveSlotsRequired: 2, // Practical sessions need 2 consecutive periods!
      requiredRoomType: "lab",
      colorCode: "#10b981",
    },
    {
      id: 5,
      courseId: 1,
      semesterId: 2,
      code: "CS501",
      name: "Database Management Systems",
      type: "theory",
      weeklySessions: 4,
      consecutiveSlotsRequired: 1,
      requiredRoomType: "lecture",
      colorCode: "#f59e0b",
    },
    {
      id: 6,
      courseId: 1,
      semesterId: 2,
      code: "CS502",
      name: "Operating Systems",
      type: "theory",
      weeklySessions: 3,
      consecutiveSlotsRequired: 1,
      requiredRoomType: "lecture",
      colorCode: "#ef4444",
    },
    {
      id: 7,
      courseId: 1,
      semesterId: 2,
      code: "CS503",
      name: "DBMS Lab",
      type: "practical",
      weeklySessions: 2,
      consecutiveSlotsRequired: 2,
      requiredRoomType: "lab",
      colorCode: "#ec4899",
    },
    {
      id: 8,
      courseId: 1,
      semesterId: 2,
      code: "CS504",
      name: "Technical Seminar & Project",
      type: "seminar",
      weeklySessions: 2,
      consecutiveSlotsRequired: 1,
      requiredRoomType: "seminar",
      colorCode: "#6366f1",
    },
  ]).onDuplicateKeyUpdate({ target: subjects.id, set: { name: subjects.name } });

  // 13. Faculty-Subject Eligibility
  console.log("Setting faculty-subject qualification mapping...");
  await db.insert(facultySubjects).values([
    { facultyId: 1, subjectId: 1, isPrimary: true }, // Dr. Sharma -> DS
    { facultyId: 1, subjectId: 4, isPrimary: true }, // Dr. Sharma -> DS Lab
    { facultyId: 1, subjectId: 5, isPrimary: false },
    { facultyId: 2, subjectId: 5, isPrimary: true }, // Dr. Anita -> DBMS
    { facultyId: 2, subjectId: 7, isPrimary: true }, // Dr. Anita -> DBMS Lab
    { facultyId: 2, subjectId: 6, isPrimary: false },
    { facultyId: 3, subjectId: 1, isPrimary: false },
    { facultyId: 3, subjectId: 4, isPrimary: true }, // Prof. Vikram -> DS Lab
    { facultyId: 3, subjectId: 6, isPrimary: true }, // Prof. Vikram -> OS
    { facultyId: 4, subjectId: 3, isPrimary: true }, // Prof. Priya -> COA
    { facultyId: 4, subjectId: 8, isPrimary: true }, // Prof. Priya -> Seminar
    { facultyId: 5, subjectId: 2, isPrimary: true }, // Prof. Rahul -> Math
    { facultyId: 6, subjectId: 3, isPrimary: true }, // Dr. Sunita -> COA
  ]).onDuplicateKeyUpdate({ target: [facultySubjects.facultyId, facultySubjects.subjectId], set: { isPrimary: facultySubjects.isPrimary } });

  // 14. Teaching Requirements
  console.log("Defining teaching requirements per class...");
  // Clear old teaching requirements to avoid duplicates
  await db.delete(teachingRequirements);
  await db.insert(teachingRequirements).values([
    // Class 1: CSE-3A (13 total sessions)
    {
      classId: 1,
      subjectId: 1, // CS301 DSA
      facultyId: 1, // Dr. Sharma
      weeklySessionsRequired: 4,
      consecutivePeriods: 1,
      preferredRoomId: 1, // LH-101
    },
    {
      classId: 1,
      subjectId: 2, // CS302 Math
      facultyId: 5, // Prof. Rahul
      weeklySessionsRequired: 4,
      consecutivePeriods: 1,
      preferredRoomId: 1,
    },
    {
      classId: 1,
      subjectId: 3, // CS303 COA
      facultyId: 6, // Dr. Sunita
      weeklySessionsRequired: 3,
      consecutivePeriods: 1,
      preferredRoomId: 1,
    },
    {
      classId: 1,
      subjectId: 4, // CS304 DS Lab
      facultyId: 3, // Prof. Vikram
      weeklySessionsRequired: 2, // 1 block of 2 consecutive periods
      consecutivePeriods: 2,
      preferredRoomId: 3, // LAB-1
    },

    // Class 2: CSE-3B (13 total sessions)
    {
      classId: 2,
      subjectId: 1, // CS301 DSA
      facultyId: 3, // Prof. Vikram
      weeklySessionsRequired: 4,
      consecutivePeriods: 1,
      preferredRoomId: 2, // LH-102
    },
    {
      classId: 2,
      subjectId: 2, // CS302 Math
      facultyId: 5, // Prof. Rahul
      weeklySessionsRequired: 4,
      consecutivePeriods: 1,
      preferredRoomId: 2,
    },
    {
      classId: 2,
      subjectId: 3, // CS303 COA
      facultyId: 4, // Prof. Priya
      weeklySessionsRequired: 3,
      consecutivePeriods: 1,
      preferredRoomId: 2,
    },
    {
      classId: 2,
      subjectId: 4, // CS304 DS Lab
      facultyId: 1, // Dr. Sharma
      weeklySessionsRequired: 2,
      consecutivePeriods: 2,
      preferredRoomId: 3, // LAB-1
    },

    // Class 3: CSE-5A (11 total sessions)
    {
      classId: 3,
      subjectId: 5, // CS501 DBMS
      facultyId: 2, // Dr. Anita
      weeklySessionsRequired: 4,
      consecutivePeriods: 1,
      preferredRoomId: 1,
    },
    {
      classId: 3,
      subjectId: 6, // CS502 OS
      facultyId: 3, // Prof. Vikram
      weeklySessionsRequired: 3,
      consecutivePeriods: 1,
      preferredRoomId: 2,
    },
    {
      classId: 3,
      subjectId: 7, // CS503 DBMS Lab
      facultyId: 2, // Dr. Anita
      weeklySessionsRequired: 2,
      consecutivePeriods: 2,
      preferredRoomId: 3, // LAB-1
    },
    {
      classId: 3,
      subjectId: 8, // CS504 Seminar
      facultyId: 4, // Prof. Priya
      weeklySessionsRequired: 2,
      consecutivePeriods: 1,
      preferredRoomId: 4, // SEMINAR-A
    },
  ]);

  // 15. Faculty Availability
  console.log("Configuring faculty availability constraints...");
  await db.delete(facultyAvailability);
  await db.insert(facultyAvailability).values([
    // Dr. Sharma unavailable Monday Period 1 (Department Academic Senate meeting)
    {
      facultyId: 1,
      dayId: 1, // Monday
      periodId: 1,
      status: "unavailable",
      reason: "HOD Weekly Senate Meeting",
    },
    // Prof. Rahul preferred morning slots
    {
      facultyId: 5,
      dayId: 1,
      periodId: 2,
      status: "preferred",
      reason: "Optimal research & lecture window",
    },
    {
      facultyId: 5,
      dayId: 2,
      periodId: 2,
      status: "preferred",
      reason: "Optimal research & lecture window",
    },
  ]);

  // 16. Audit Log
  await db.insert(auditLogs).values({
    userId: 1,
    action: "SYSTEM_SEEDED",
    entityType: "database",
    entityId: 1,
    detailsJson: JSON.stringify({
      message: "Database seeded successfully with initial master academic data",
      classes: 3,
      faculty: 6,
      classrooms: 4,
      days: 5,
      periods: 6,
    }),
  });

  console.log("✅ Seed completed successfully!");
  console.log("Default credentials:");
  console.log("  Admin: admin@college.edu / Admin@123");
  console.log("  Coordinator: coordinator@college.edu / Coord@123");
  console.log("  Faculty: dr.sharma@college.edu / Faculty@123 (or any faculty user)");
}

seed()
  .catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
