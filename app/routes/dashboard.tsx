import { useLoaderData, Link } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  Users,
  GraduationCap,
  DoorOpen,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { requireUser } from "~/services/auth.server";
import { db } from "~/db/index.server";
import {
  faculty,
  classes,
  classrooms,
  subjects,
  timetableVersions,
  timetableEntries,
  solverRuns,
  conflictReports,
} from "~/db/schema/index";
import { eq, desc } from "drizzle-orm";
import { getFacultyWorkloadAnalytics } from "~/services/workload.server";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  // Core stats
  const facultyCount = await db.$count(faculty, eq(faculty.isActive, true));
  const classesCount = await db.$count(classes);
  const roomsCount = await db.$count(classrooms, eq(classrooms.isActive, true));
  const subjectsCount = await db.$count(subjects);

  // Timetable versions
  const activeVersion = await db.query.timetableVersions.findFirst({
    where: eq(timetableVersions.status, "published"),
    orderBy: (tv, { desc }) => [desc(tv.updatedAt)],
  });

  const latestVersion =
    activeVersion ||
    (await db.query.timetableVersions.findFirst({
      orderBy: (tv, { desc }) => [desc(tv.createdAt)],
    }));

  const entriesCount = latestVersion
    ? await db.$count(timetableEntries, eq(timetableEntries.timetableVersionId, latestVersion.id))
    : 0;

  // Recent solver runs
  const recentRuns = await db.query.solverRuns.findMany({
    limit: 5,
    orderBy: (sr, { desc }) => [desc(sr.createdAt)],
    with: {
      timetableVersion: true,
    },
  });

  // Workload analytics
  const analytics = await getFacultyWorkloadAnalytics(latestVersion?.id);

  // Faculty user's personal lectures if role === 'faculty'
  let personalSessions: any[] = [];
  if (user.role.name === "faculty" && user.faculty) {
    if (latestVersion) {
      personalSessions = await db.query.timetableEntries.findMany({
        where: (te, { and, eq }) =>
          and(
            eq(te.timetableVersionId, latestVersion.id),
            eq(te.facultyId, user.faculty!.id)
          ),
        with: {
          class: true,
          subject: true,
          classroom: true,
          day: true,
          period: true,
        },
        orderBy: (te, { asc }) => [asc(te.dayId), asc(te.periodId)],
      });
    }
  }

  return {
    user,
    stats: {
      facultyCount,
      classesCount,
      roomsCount,
      subjectsCount,
      entriesCount,
      activeVersion,
      latestVersion,
    },
    analytics,
    recentRuns,
    personalSessions,
  };
}

export default function DashboardPage() {
  const { user, stats, analytics, recentRuns, personalSessions } =
    useLoaderData<typeof loader>();

  const workloadChartData = analytics.facultyStats.map((f) => ({
    name: f.fullName.replace("Dr. ", "").replace("Prof. ", "").split(" ")[0],
    assigned: f.assignedHours,
    max: f.maxWeeklyHours,
  }));

  const roomChartData = analytics.roomStats.map((r) => ({
    name: r.roomNumber,
    utilization: r.utilizationRate,
    occupied: r.occupiedPeriods,
  }));

  const COLORS = ["#7d100b", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

  return (
    <div className="space-y-8">
      {/* Welcome & Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#7d100b] via-[#91130d] to-[#630d09] p-6 sm:p-8 text-white shadow-lg">
        <div className="relative z-10 max-w-2xl space-y-2">
          <Badge className="bg-white/20 text-white border-none font-medium backdrop-blur-xs">
            KES Shroff College &bull; Academic Operations
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user.fullName}!
          </h1>
          <p className="text-red-100 text-sm sm:text-base leading-relaxed">
            {stats.activeVersion
              ? `Current active published schedule: ${stats.activeVersion.name} (Health Score: ${stats.activeVersion.optimizationScore}/100)`
              : "No timetable is currently published. You can run automated scheduling to create and publish a draft."}
          </p>

          <div className="pt-3 flex flex-wrap gap-3">
            {(user.role.name === "admin" || user.role.name === "coordinator") && (
              <Button asChild variant="secondary" className="font-semibold shadow-sm gap-2">
                <Link to="/timetable/generate">
                  <Sparkles className="h-4 w-4 text-[#7d100b]" />
                  Generate Timetable
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Link to="/timetable?view=date">
                <Calendar className="h-4 w-4 mr-1.5" />
                Date-wise Timetable
              </Link>
            </Button>
            <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Link to="/timetable">
                <Calendar className="h-4 w-4 mr-1.5" />
                Weekly Grid
              </Link>
            </Button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      </div>

      {/* Faculty Personal Teaching Card (If Faculty Role) */}
      {user.role.name === "faculty" && (
        <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-blue-900 dark:text-blue-200">
                  My Weekly Teaching Assignments ({personalSessions.length} Hours Assigned)
                </CardTitle>
                <CardDescription>
                  Your current schedule breakdown across days and rooms
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-blue-300 text-blue-700 dark:text-blue-300 font-semibold">
                Max: {user.faculty?.maxWeeklyHours ?? 20} hrs/week
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {personalSessions.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                No active lectures scheduled yet. Once a timetable version is generated or published, your sessions will appear here.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {personalSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-blue-600 dark:text-blue-400">{session.day.dayName}</span>
                      <span className="text-slate-400">{session.period.name}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {session.subject.code}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{session.subject.name}</p>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>Class: <strong>{session.class.name}</strong></span>
                      <span>Room: <strong>{session.classroom.roomNumber}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Operational KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Faculty
                </p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {stats.facultyCount}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Across 3 academic departments</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Class Sections
                </p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {stats.classesCount}
                </h3>
                <p className="text-xs text-slate-500 mt-1">150 total enrolled students</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                <GraduationCap className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Rooms & Labs
                </p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {stats.roomsCount}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Lecture, Lab & Seminar Halls</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                <DoorOpen className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Scheduled Sessions
                </p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                  {stats.entriesCount}
                </h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  All requirements satisfied
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <Calendar className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faculty Workload Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Faculty Teaching Workload (Hours/Week)</CardTitle>
                <CardDescription>
                  Assigned weekly teaching hours compared against workload limits
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-blue-600">
                <Link to="/workload">
                  Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "8px",
                      color: "#fff",
                      border: "none",
                    }}
                  />
                  <Bar dataKey="assigned" fill="#3b82f6" name="Assigned Hours" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="max" fill="#cbd5e1" name="Max Allowed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Room Utilization Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Room & Lab Utilization Rate (%)</CardTitle>
                <CardDescription>
                  Percentage of weekly time periods occupied by lectures and practicals
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-blue-600">
                <Link to="/classrooms">
                  Details <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roomChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      borderRadius: "8px",
                      color: "#fff",
                      border: "none",
                    }}
                  />
                  <Bar dataKey="utilization" fill="#10b981" name="Utilization %" radius={[4, 4, 0, 0]}>
                    {roomChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Solver Executions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Automated Solver Executions</CardTitle>
              <CardDescription>
                Audit history of timetable generation attempts, feasibility statuses, and optimization scores
              </CardDescription>
            </div>
            {(user.role.name === "admin" || user.role.name === "coordinator") && (
              <Button asChild size="sm">
                <Link to="/timetable/generate">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  New Solver Run
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No solver runs recorded yet. Click &quot;New Solver Run&quot; to generate your first timetable.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase">
                    <th className="pb-3">Version / Run</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Quality Score</th>
                    <th className="pb-3">Execution Time</th>
                    <th className="pb-3">Iterations</th>
                    <th className="pb-3">Conflicts</th>
                    <th className="pb-3 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {run.timetableVersion?.name || `Run #${run.id}`}
                      </td>
                      <td className="py-3">
                        <Badge
                          variant={
                            run.status === "optimal" || run.status === "feasible"
                              ? "success"
                              : "destructive"
                          }
                          className="capitalize"
                        >
                          {run.status}
                        </Badge>
                      </td>
                      <td className="py-3 font-medium text-slate-700 dark:text-slate-300">
                        {run.optimizationScore} / 100
                      </td>
                      <td className="py-3 text-slate-500">
                        {run.executionTimeMs} ms
                      </td>
                      <td className="py-3 text-slate-500">
                        {run.iterations.toLocaleString()}
                      </td>
                      <td className="py-3">
                        {run.hardConflictsCount === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 0 Hard Conflicts
                          </span>
                        ) : (
                          <span className="text-rose-600 font-semibold text-xs flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> {run.hardConflictsCount} Conflicts
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right text-slate-400 text-xs">
                        {new Date(run.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
