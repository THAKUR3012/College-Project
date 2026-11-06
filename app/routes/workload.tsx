import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { requireUser } from "~/services/auth.server";
import { getFacultyWorkloadAnalytics } from "~/services/workload.server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const analytics = await getFacultyWorkloadAnalytics();
  return { user, analytics };
}

export default function WorkloadPage() {
  const { analytics } = useLoaderData<typeof loader>();

  const chartData = analytics.facultyStats.map((f) => ({
    name: f.fullName.replace("Dr. ", "").replace("Prof. ", "").split(" ")[0],
    assigned: f.assignedHours,
    max: f.maxWeeklyHours,
    utilization: f.utilizationRate,
  }));

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "optimal":
        return "success";
      case "near_capacity":
        return "warning";
      case "over_capacity":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          Faculty Workload & Utilization Management
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Monitor teaching distribution across departments, verify contractual weekly limits, and audit workload equity.
        </p>
      </div>

      {/* Department Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {analytics.departmentStats.map((dept, idx) => (
          <Card key={idx}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {dept.department}
                  </p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                    {dept.totalAssignedHours} Hours/Wk
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Avg: <strong>{dept.averageHoursPerFaculty} hrs</strong> / instructor ({dept.facultyCount} faculty)
                  </p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Building className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart: Assigned vs Max Workload */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Faculty Workload Comparison (Assigned vs Limit)</CardTitle>
          <CardDescription>
            Validates that no instructor is scheduled beyond their weekly contractual ceiling
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    borderRadius: "8px",
                    color: "#fff",
                    border: "none",
                  }}
                />
                <Legend />
                <Bar dataKey="assigned" fill="#3b82f6" name="Assigned Teaching Hours" radius={[4, 4, 0, 0]} />
                <Bar dataKey="max" fill="#cbd5e1" name="Max Weekly Hours" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Faculty Workload Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comprehensive Faculty Allocation Roster</CardTitle>
          <CardDescription>
            Daily breakdown, subject distribution, and capacity compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Faculty Member</th>
                  <th className="p-4">Workload Status</th>
                  <th className="p-4">Hours Ratio</th>
                  <th className="p-4">Daily Distribution (Mon - Fri)</th>
                  <th className="p-4">Teaching Subjects</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.facultyStats.map((fac) => (
                  <tr key={fac.facultyId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {fac.fullName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {fac.designation} &bull; {fac.department}
                      </div>
                    </td>

                    <td className="p-4">
                      <Badge variant={getStatusBadgeVariant(fac.statusBadge)} className="capitalize text-xs font-semibold">
                        {fac.statusBadge.replace("_", " ")}
                      </Badge>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {fac.utilizationRate}% Capacity
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-slate-900 dark:text-white">
                          {fac.assignedHours}
                        </span>
                        <span className="text-xs text-slate-400">/ {fac.maxWeeklyHours} hrs</span>
                      </div>
                      <div className="w-28 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            fac.assignedHours > fac.maxWeeklyHours
                              ? "bg-rose-500"
                              : fac.utilizationRate >= 80
                              ? "bg-blue-600"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(100, fac.utilizationRate)}%` }}
                        />
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {analytics.allDays.map((d) => {
                          const hrs = fac.dayDistribution[d.dayName] || 0;
                          return (
                            <div
                              key={d.id}
                              className="text-center p-1 rounded bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 min-w-[36px]"
                            >
                              <span className="text-[10px] font-semibold text-slate-400 block">
                                {d.dayName.slice(0, 3)}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                {hrs}h
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {fac.subjectBreakdown.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold"
                          >
                            {s.code}: {s.hours}h
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
