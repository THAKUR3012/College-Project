import { generateTimetable } from "./timetable-generator";
import { db, pool } from "../db/index.server";

async function runSolverTest() {
  console.log("==================================================");
  console.log("🧪 TESTING AUTOMATED TIMETABLE SOLVER ENGINE");
  console.log("==================================================");

  // 1. Fetch live seeded data from MySQL
  const classesList = await db.query.classes.findMany();
  const facultyList = await db.query.faculty.findMany();
  const roomsList = await db.query.classrooms.findMany();
  const subjectsList = await db.query.subjects.findMany();
  const daysList = await db.query.workingDays.findMany({ orderBy: (d, { asc }) => [asc(d.dayOrder)] });
  const periodsList = await db.query.periods.findMany({ orderBy: (p, { asc }) => [asc(p.periodNumber)] });
  const facultyAvail = await db.query.facultyAvailability.findMany();
  const roomAvail = await db.query.roomAvailability.findMany();
  const requirements = await db.query.teachingRequirements.findMany();

  console.log(`Input parameters:`);
  console.log(`• Classes: ${classesList.length}`);
  console.log(`• Faculty: ${facultyList.length}`);
  console.log(`• Classrooms: ${roomsList.length}`);
  console.log(`• Subjects: ${subjectsList.length}`);
  console.log(`• Working Days: ${daysList.length}`);
  console.log(`• Periods/Day: ${periodsList.length}`);
  console.log(`• Total Requirements: ${requirements.length}`);
  const totalRequired = requirements.reduce((acc, r) => acc + r.weeklySessionsRequired, 0);
  console.log(`• Total Weekly Sessions Required: ${totalRequired}`);

  // Test Case 1: Standard Feasible / Optimal Generation
  console.log("\n▶ TEST CASE 1: Feasible Generation with Constraints");
  const result = generateTimetable(
    requirements,
    classesList,
    facultyList,
    roomsList,
    subjectsList,
    daysList,
    periodsList,
    facultyAvail,
    roomAvail,
    [],
    { maxTimeMs: 10000, enableOptimization: true }
  );

  console.log(`Status: ${result.status.toUpperCase()}`);
  console.log(`Execution Time: ${result.executionTimeMs} ms`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Optimization Score: ${result.optimizationScore} / 100`);
  console.log(`Hard Violations: ${result.hardViolations.length}`);
  console.log(`Soft Violations: ${result.softViolations.length}`);
  console.log(`Assigned Sessions: ${result.entries.length} / ${totalRequired}`);
  console.log(`Diagnosis Summary:\n  ${result.diagnosisSummary}`);

  if (result.hardViolations.length > 0) {
    console.error("❌ Hard constraint violations detected:", result.hardViolations);
    process.exit(1);
  }

  // Test Case 2: Intentionally Infeasible Scenario
  console.log("\n▶ TEST CASE 2: Intentionally Infeasible Scenario (Demanding 35 hours from Faculty 1 capped at 18 hrs)");
  const infeasibleReqs = [
    ...requirements,
    {
      id: 999,
      classId: 1,
      subjectId: 1,
      facultyId: 1, // Dr. Sharma (max 18 hrs)
      weeklySessionsRequired: 30, // Unreasonable load!
      consecutivePeriods: 1,
      preferredRoomId: 1,
    },
  ];

  const infeasibleResult = generateTimetable(
    infeasibleReqs,
    classesList,
    facultyList,
    roomsList,
    subjectsList,
    daysList,
    periodsList,
    facultyAvail,
    roomAvail,
    [],
    { maxTimeMs: 5000 }
  );

  console.log(`Status: ${infeasibleResult.status.toUpperCase()}`);
  console.log(`Diagnosis Summary:\n  ${infeasibleResult.diagnosisSummary}`);
  console.log(`Hard Violations Detected: ${infeasibleResult.hardViolations.length}`);
  if (infeasibleResult.status === "infeasible") {
    console.log("✅ Infeasible scenario successfully detected and diagnosed!");
  } else {
    console.error("❌ Infeasible scenario was not caught!");
    process.exit(1);
  }

  console.log("\n✨ ALL ALGORITHM TESTS PASSED SUCCESSFULLY!");
}

runSolverTest()
  .catch((e) => {
    console.error("Test error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
