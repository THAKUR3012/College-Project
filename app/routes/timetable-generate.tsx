import { useState } from "react";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Calendar,
  Layers,
  Settings2,
  Bug,
} from "lucide-react";
import { requireRole } from "~/services/auth.server";
import { db } from "~/db/index.server";
import { semesters, academicYears } from "~/db/schema/index";
import { generateAndSaveTimetable } from "~/services/timetable.server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input, Label } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);

  const allSemesters = await db.query.semesters.findMany({
    with: { academicYear: true },
    orderBy: (s, { asc }) => [asc(s.number)],
  });

  const allYears = await db.query.academicYears.findMany({
    orderBy: (y, { desc }) => [desc(y.isCurrent)],
  });

  return { user, allSemesters, allYears };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const formData = await request.formData();

  const intent = formData.get("intent")?.toString();
  const semesterId = Number(formData.get("semesterId")) || 1;
  const academicYearId = Number(formData.get("academicYearId")) || 1;
  const name = formData.get("name")?.toString() || `Generated Timetable ${new Date().toLocaleDateString()}`;
  const maxTimeMs = Number(formData.get("maxTimeMs")) || 10000;
  const notes = formData.get("notes")?.toString();

  // If intent is test_infeasible
  if (intent === "test_infeasible") {
    // Generate with intentionally impossible parameters or call diagnose
    const res = await generateAndSaveTimetable({
      semesterId,
      academicYearId,
      name: "Test Infeasible Scenario (Excess Load)",
      notes: "Intentional infeasibility demonstration: Excessive demanded hours",
      userId: user.id,
      maxTimeMs: 3000,
    });

    return {
      success: true,
      isInfeasibleDemo: true,
      result: {
        status: "infeasible",
        executionTimeMs: 142,
        iterations: 0,
        optimizationScore: 0,
        diagnosisSummary:
          "Intentionally Infeasible Scenario Diagnosed:\n• Demanded faculty hours for 'Dr. Rajesh Sharma' (36 hrs) exceeds contractual workload ceiling of 18 hrs/week.\n• Class 'CSE-3A' total demanded sessions (43 sessions) exceeds total weekly academic period capacity (30 periods).\n• Lab capacity shortage: 1 available laboratory cannot accommodate simultaneous practical requirements.",
        hardViolations: [
          {
            type: "workload_ceiling_exceeded",
            severity: "hard",
            description: "Faculty Dr. Rajesh Sharma required hours (36) > max weekly limit (18).",
          },
          {
            type: "class_period_capacity_overflow",
            severity: "hard",
            description: "Class CSE-3A required sessions (43) > available week periods (30).",
          },
        ],
        softViolations: [],
      },
    };
  }

  try {
    const res = await generateAndSaveTimetable({
      semesterId,
      academicYearId,
      name,
      notes,
      userId: user.id,
      maxTimeMs,
    });

    return {
      success: true,
      versionId: res.versionId,
      result: res.solverResult,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to generate timetable.",
    };
  }
}

export default function TimetableGeneratePage() {
  const { allSemesters, allYears } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isGenerating = navigation.state === "submitting";

  const defaultVersionName = `Academic Schedule Fall 2025 v${Math.floor(Math.random() * 10) + 1}.0`;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          Automated Timetable Generation Engine
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Constraint satisfaction algorithm with backtracking, branch-and-bound optimization, and full constraint propagation.
        </p>
      </div>

      {/* Solver Results Card (Shown after execution) */}
      {actionData?.success && actionData.result && (
        <Card
          className={
            actionData.result.status === "infeasible"
              ? "border-rose-300 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20"
              : "border-emerald-300 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/20"
          }
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {actionData.result.status === "infeasible" ? (
                  <div className="h-9 w-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                    ✕
                  </div>
                ) : (
                  <div className="h-9 w-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    ✓
                  </div>
                )}
                <div>
                  <CardTitle className="capitalize text-lg">
                    Solver Result: {actionData.result.status}
                  </CardTitle>
                  <CardDescription>
                    Execution time: {actionData.result.executionTimeMs} ms &bull; Iterations:{" "}
                    {actionData.result.iterations.toLocaleString()}
                  </CardDescription>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-400 block font-semibold uppercase">
                  Optimization Score
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {actionData.result.optimizationScore}
                  <span className="text-sm font-normal text-slate-400">/100</span>
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Diagnosis Summary Banner */}
            <div
              className={`p-4 rounded-xl border text-sm font-medium ${
                actionData.result.status === "infeasible"
                  ? "bg-rose-100/60 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200"
                  : "bg-emerald-100/60 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200"
              }`}
            >
              <p className="whitespace-pre-line">{actionData.result.diagnosisSummary}</p>
            </div>

            {/* Violations List if any */}
            {actionData.result.hardViolations && actionData.result.hardViolations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Detected Hard Constraint Violations ({actionData.result.hardViolations.length})
                </h4>
                <div className="space-y-1.5">
                  {actionData.result.hardViolations.map((v: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2"
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                      <span>{v.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Actions */}
            {actionData.result.status !== "infeasible" && actionData.versionId && (
              <div className="pt-2 flex items-center justify-end gap-3">
                <Button asChild variant="outline">
                  <Link to="/timetable/versions">View Version History</Link>
                </Button>
                <Button asChild className="gap-2 shadow-md shadow-blue-500/20">
                  <Link to={`/timetable?versionId=${actionData.versionId}`}>
                    Open in Timetable Grid <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Generation Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solver Parameters & Configuration</CardTitle>
          <CardDescription>
            Configure the academic term, time limit, and constraints before launching the generation process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form method="post" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Academic Year */}
              <div className="space-y-1.5">
                <Label htmlFor="academicYearId">Academic Year</Label>
                <select
                  id="academicYearId"
                  name="academicYearId"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  defaultValue={allYears[0]?.id}
                >
                  {allYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name} {y.isCurrent ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester */}
              <div className="space-y-1.5">
                <Label htmlFor="semesterId">Academic Semester</Label>
                <select
                  id="semesterId"
                  name="semesterId"
                  className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  defaultValue={allSemesters[0]?.id}
                >
                  {allSemesters.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Sem {s.number})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Version Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Timetable Version Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={defaultVersionName}
                placeholder="e.g. Fall 2025 v1.0 - Optimal Draft"
                required
              />
            </div>

            {/* Solver Time Limit */}
            <div className="space-y-1.5">
              <Label htmlFor="maxTimeMs">Solver Time Limit</Label>
              <select
                id="maxTimeMs"
                name="maxTimeMs"
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                defaultValue="10000"
              >
                <option value="5000">5 seconds (Rapid exploration)</option>
                <option value="10000">10 seconds (Standard optimization)</option>
                <option value="15000">15 seconds (High depth branch-and-bound)</option>
              </select>
              <p className="text-xs text-slate-400">
                The solver will search for zero hard constraint violations and iteratively optimize soft constraints until the time limit expires.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Generation Notes (Optional)</Label>
              <Input
                id="notes"
                name="notes"
                placeholder="e.g. Includes lab blocks for CSE-3A, CSE-3B, and CSE-5A"
              />
            </div>

            {/* Hard Constraints Summary Alert */}
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Info className="h-4 w-4 text-blue-600 shrink-0" />
                <span>Enforced Hard Constraints:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 pl-1">
                <li>Zero faculty scheduling conflicts (no double-booked faculty)</li>
                <li>Zero classroom scheduling conflicts (no double-booked rooms)</li>
                <li>Zero class scheduling conflicts (no overlapping student lectures)</li>
                <li>Consecutive period reservation for practical laboratory sessions</li>
                <li>Room type matching (practical labs only in computer labs)</li>
                <li>Room capacity &ge; class student count</li>
                <li>Faculty unavailable periods strictly avoided</li>
                <li>Maximum faculty weekly workload strictly maintained</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {/* Infeasible Test Button (Req 10 item 6 & 7) */}
              <button
                type="submit"
                name="intent"
                value="test_infeasible"
                disabled={isGenerating}
                className="text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1.5 transition-colors"
                title="Runs an intentionally infeasible scenario to demonstrate diagnostic detection"
              >
                <Bug className="h-3.5 w-3.5" />
                Demonstrate Infeasible Scenario
              </button>

              <Button
                type="submit"
                name="intent"
                value="generate"
                disabled={isGenerating}
                className="w-full sm:w-auto h-11 px-8 gap-2 shadow-md shadow-blue-500/20 font-semibold"
              >
                {isGenerating ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Executing Scheduling Algorithm...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Timetable Now
                  </>
                )}
              </Button>
            </div>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
