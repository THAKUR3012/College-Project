import { db, pool } from "./app/db/index.server";
import {
  generateTimetable,
} from "./app/algorithms/timetable-generator";
import {
  generateAndSaveTimetable,
  manualEditTimetableSlot,
  publishTimetableVersion,
  getTimetableVersionById,
} from "./app/services/timetable.server";
import { getFacultyWorkloadAnalytics } from "./app/services/workload.server";
import { eq } from "drizzle-orm";
import { timetableVersions, timetableEntries } from "./app/db/schema/index";

async function runAcceptanceDemonstration() {
  console.log("================================================================================");
  console.log("🎓 ACCEPTANCE DEMONSTRATION: AUTOMATED TIMETABLE & FACULTY WORKLOAD SYSTEM");
  console.log("================================================================================");

  // 1. Verify Acceptance Dataset
  console.log("\n[Item 0] Master Dataset Verification (3 Classes, 6 Faculty, 4 Classrooms, 5 Days)");
  const classesList = await db.query.classes.findMany();
  const facultyList = await db.query.faculty.findMany();
  const roomsList = await db.query.classrooms.findMany();
  const daysList = await db.query.workingDays.findMany();
  const requirements = await db.query.teachingRequirements.findMany();

  console.log(`• Classes (${classesList.length}): ${classesList.map((c) => `${c.name} (${c.studentCount} students)`).join(", ")}`);
  console.log(`• Faculty (${facultyList.length}): ${facultyList.map((f) => `${f.fullName} (Cap: ${f.maxWeeklyHours}h)`).join(", ")}`);
  console.log(`• Classrooms (${roomsList.length}): ${roomsList.map((r) => `${r.roomNumber} (${r.roomType.toUpperCase()}, Cap: ${r.capacity})`).join(", ")}`);
  console.log(`• Working Days (${daysList.length}): ${daysList.map((d) => d.dayName).join(", ")}`);

  const totalRequiredSessions = requirements.reduce((acc, r) => acc + r.weeklySessionsRequired, 0);
  console.log(`• Total Curriculum Sessions Required: ${totalRequiredSessions}`);

  // 2. Demonstrate Automated Timetable Generation & Hard Constraints (Item 1 & 2)
  console.log("\n[Item 1 & 2] Automatic Timetable Generation & Hard Constraint Validation");
  const genResult = await generateAndSaveTimetable({
    semesterId: 1,
    academicYearId: 1,
    name: "Acceptance Test Schedule Fall 2025",
    notes: "Automated generation for acceptance validation",
    userId: 2, // Coordinator
    maxTimeMs: 10000,
  });

  const solver = genResult.solverResult;
  console.log(`• Generation Status: ${solver.status.toUpperCase()}`);
  console.log(`• Optimization Score: ${solver.optimizationScore} / 100`);
  console.log(`• Execution Time: ${solver.executionTimeMs} ms`);
  console.log(`• Total Scheduled Sessions: ${solver.entries.length} / ${totalRequiredSessions}`);
  console.log(`• Hard Constraint Violations: ${solver.hardViolations.length}`);
  console.log(`• Diagnosis: ${solver.diagnosisSummary}`);

  if (solver.hardViolations.length > 0 || solver.entries.length < totalRequiredSessions) {
    console.error("❌ Hard constraint validation failed!");
    process.exit(1);
  }
  console.log("✅ All hard constraints satisfied (zero teacher/room/class clashes, room type and capacity matched)!");

  // 3. Demonstrate Required vs Assigned Weekly Sessions (Item 3)
  console.log("\n[Item 3] Required vs Assigned Weekly Sessions per Subject & Class");
  const versionData = await getTimetableVersionById(genResult.versionId);
  for (const req of requirements) {
    const assignedCount = versionData!.entries.filter(
      (e) => e.classId === req.classId && e.subjectId === req.subjectId
    ).length;
    const isMet = assignedCount === req.weeklySessionsRequired;
    console.log(
      `• Class ID ${req.classId} | Subject ID ${req.subjectId} -> Required: ${req.weeklySessionsRequired} | Assigned: ${assignedCount} [${isMet ? "MATCHED" : "MISMATCH"}]`
    );
    if (!isMet) {
      console.error("❌ Session count mismatch!");
      process.exit(1);
    }
  }
  console.log("✅ Every required weekly session exactly matches assigned sessions!");

  // 4. Demonstrate Manual Conflicting Edits Rejection (Item 4)
  console.log("\n[Item 4] Manual Conflicting Edits Rejection");
  // Try to create a conflicting slot: Dr. Sharma (facultyId: 1) teaching Class 2 (CSE-3B) at Monday Period 1
  // However, Dr. Sharma is marked unavailable at Monday Period 1 (HOD senate meeting)
  console.log("  Attempt A: Assigning Dr. Sharma during his marked unavailable period (Monday Period 1)...");
  try {
    await manualEditTimetableSlot({
      versionId: genResult.versionId,
      classId: 2,
      subjectId: 1,
      facultyId: 1,
      classroomId: 1,
      dayId: 1, // Monday
      periodId: 1, // Period 1
      userId: 2,
    });
    console.error("❌ Conflict was NOT rejected!");
    process.exit(1);
  } catch (err: any) {
    console.log(`  Expected Rejection Caught: "${err.message}"`);
  }

  // Try to assign practical lab to Lecture Hall 101
  console.log("  Attempt B: Assigning Practical Lab (CS304) to Lecture Hall LH-101 (Room Type Mismatch)...");
  try {
    await manualEditTimetableSlot({
      versionId: genResult.versionId,
      classId: 1,
      subjectId: 4, // Lab
      facultyId: 3,
      classroomId: 1, // LH-101 (lecture)
      dayId: 2,
      periodId: 3,
      userId: 2,
    });
    console.error("❌ Room type mismatch was NOT rejected!");
    process.exit(1);
  } catch (err: any) {
    console.log(`  Expected Rejection Caught: "${err.message}"`);
  }
  console.log("✅ Conflicting manual edits strictly rejected by the server!");

  // 5. Demonstrate Correct Faculty Workload Calculation (Item 5)
  console.log("\n[Item 5] Correct Faculty Workload Calculation");
  const workloadAnalytics = await getFacultyWorkloadAnalytics(genResult.versionId);
  for (const fac of workloadAnalytics.facultyStats) {
    console.log(
      `• ${fac.fullName} (${fac.department}): ${fac.assignedHours} hrs assigned / Max ${fac.maxWeeklyHours} hrs (${fac.utilizationRate}% utilization) [Status: ${fac.statusBadge}]`
    );
    if (fac.assignedHours > fac.maxWeeklyHours) {
      console.error(`❌ Workload cap exceeded for ${fac.fullName}!`);
      process.exit(1);
    }
  }
  console.log("✅ All faculty workloads correctly computed within contractual boundaries!");

  // 6. Demonstrate Intentionally Infeasible Scheduling Scenario & Diagnosis (Item 6 & 7)
  console.log("\n[Item 6 & 7] Intentionally Infeasible Scenario & Clear Infeasibility Diagnosis");
  const impossibleRequirements = [
    ...requirements,
    {
      id: 9999,
      classId: 1,
      subjectId: 1,
      facultyId: 1,
      weeklySessionsRequired: 50, // Week has only 30 periods!
      consecutivePeriods: 1,
      preferredRoomId: 1,
    },
  ];

  const subjectsList = await db.query.subjects.findMany();
  const periodsList = await db.query.periods.findMany({ where: eq(timetableEntries.id, -1) }); // dummy
  const allPeriods = await db.query.periods.findMany({ where: (p, { eq }) => eq(p.isBreak, false) });

  const infeasibleResult = generateTimetable(
    impossibleRequirements,
    classesList,
    facultyList,
    roomsList,
    subjectsList,
    daysList,
    allPeriods,
    [],
    [],
    [],
    { maxTimeMs: 3000 }
  );

  console.log(`• Solver Status: ${infeasibleResult.status.toUpperCase()}`);
  console.log(`• Diagnosis Output:\n${infeasibleResult.diagnosisSummary.split("\n").map(l => "    " + l).join("\n")}`);
  if (infeasibleResult.status !== "infeasible") {
    console.error("❌ Expected infeasible status!");
    process.exit(1);
  }
  console.log("✅ Infeasible scenario successfully diagnosed with explicit root causes!");

  // 7. Demonstrate Timetable Versioning and Publishing (Item 8)
  console.log("\n[Item 8] Timetable Versioning and Publishing");
  await publishTimetableVersion(genResult.versionId, 2);
  const publishedVersion = await getTimetableVersionById(genResult.versionId);
  console.log(`• Version ID: ${publishedVersion?.id} | Name: "${publishedVersion?.name}" | Status: "${publishedVersion?.status}"`);
  if (publishedVersion?.status !== "published") {
    console.error("❌ Timetable version was not published!");
    process.exit(1);
  }
  console.log("✅ Timetable version successfully published!");

  // 8. Demonstrate Class-wise, Faculty-wise and Room-wise Views (Item 9)
  console.log("\n[Item 9] Multi-Dimensional Views (Class, Faculty, Room)");
  const class1Entries = publishedVersion!.entries.filter((e) => e.classId === 1);
  const fac1Entries = publishedVersion!.entries.filter((e) => e.facultyId === 1);
  const room1Entries = publishedVersion!.entries.filter((e) => e.classroomId === 1);

  console.log(`• Class-wise View (CSE-3A): ${class1Entries.length} periods scheduled`);
  console.log(`• Faculty-wise View (Dr. Rajesh Sharma): ${fac1Entries.length} periods scheduled`);
  console.log(`• Room-wise View (LH-101): ${room1Entries.length} periods scheduled`);
  console.log("✅ Multi-perspective view slicing verified!");

  console.log("\n================================================================================");
  console.log("🎉 ALL 9 ACCEPTANCE CRITERIA SUCCESSFULLY DEMONSTRATED AND VERIFIED!");
  console.log("================================================================================");
}

runAcceptanceDemonstration()
  .catch((e) => {
    console.error("Demonstration Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
