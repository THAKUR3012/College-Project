import { useState } from "react";
import { useLoaderData, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { AlertTriangle, ShieldCheck, CheckCircle2, Clock, Sparkles, Filter } from "lucide-react";
import { requireRole } from "~/services/auth.server";
import { db } from "~/db/index.server";
import { conflictReports, timetableVersions } from "~/db/schema/index";
import { eq, desc } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);

  const allVersions = await db.query.timetableVersions.findMany({
    orderBy: (tv, { desc }) => [desc(tv.createdAt)],
  });

  const latestVersion = allVersions[0] || null;

  const conflicts = latestVersion
    ? await db.query.conflictReports.findMany({
        where: eq(conflictReports.timetableVersionId, latestVersion.id),
        with: {
          period: true,
          day: true,
        },
        orderBy: (c, { asc }) => [asc(c.severity)],
      })
    : [];

  return { user, allVersions, latestVersion, conflicts };
}

export default function ConflictsPage() {
  const { allVersions, latestVersion, conflicts } = useLoaderData<typeof loader>();
  const [filterSeverity, setFilterSeverity] = useState<"all" | "hard" | "soft">("all");

  const hardCount = conflicts.filter((c) => c.severity === "hard").length;
  const softCount = conflicts.filter((c) => c.severity === "soft").length;

  const filteredConflicts = conflicts.filter((c) => {
    if (filterSeverity === "all") return true;
    return c.severity === filterSeverity;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            Conflict & Quality Audit Reports
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Diagnostic verification of hard scheduling constraints and soft preference optimizations.
          </p>
        </div>

        <Button asChild className="gap-2 shadow-md shadow-blue-500/20">
          <Link to="/timetable/generate">
            <Sparkles className="h-4 w-4" />
            Re-run Solver
          </Link>
        </Button>
      </div>

      {/* Compliance Overview Banner */}
      <div
        className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${
          hardCount === 0
            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
            : "bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
              hardCount === 0 ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {hardCount === 0 ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {hardCount === 0
                ? "Zero Hard Constraint Conflicts (Feasible for Deployment)"
                : `${hardCount} Hard Constraint Violation(s) Detected`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Auditing Version: <strong>{latestVersion?.name || "None"}</strong> &bull; Score:{" "}
              <strong>{latestVersion?.optimizationScore ?? 0}/100</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={hardCount === 0 ? "success" : "destructive"}>
            {hardCount} Hard Conflicts
          </Badge>
          <Badge variant="secondary">
            {softCount} Soft Optimization Notes
          </Badge>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Filter:
        </span>
        <button
          type="button"
          onClick={() => setFilterSeverity("all")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            filterSeverity === "all"
              ? "bg-blue-600 text-white font-semibold"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          All ({conflicts.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterSeverity("hard")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            filterSeverity === "hard"
              ? "bg-rose-600 text-white font-semibold"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          Hard Violations ({hardCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterSeverity("soft")}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            filterSeverity === "soft"
              ? "bg-blue-600 text-white font-semibold"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          Soft Penalties ({softCount})
        </button>
      </div>

      {/* Conflicts List */}
      <Card>
        <CardContent className="p-0">
          {filteredConflicts.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                No Constraint Violations Found
              </h4>
              <p className="text-xs text-slate-500">
                All scheduling rules and optimization parameters are fully satisfied.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredConflicts.map((c) => (
                <div key={c.id} className="p-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={c.severity === "hard" ? "destructive" : "secondary"}
                        className="capitalize text-[10px] font-bold"
                      >
                        {c.severity}
                      </Badge>
                      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {c.conflictType}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {c.description}
                    </p>
                    {c.day && c.period && (
                      <p className="text-xs text-slate-400">
                        Affects: {c.day.dayName}, {c.period.name}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(c.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
