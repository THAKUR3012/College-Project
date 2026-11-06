import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Users,
  DoorOpen,
  CheckCircle2,
} from "lucide-react";
import { requireUser } from "~/services/auth.server";
import { db } from "~/db/index.server";
import { timetableVersions, timetableEntries } from "~/db/schema/index";
import { eq, desc } from "drizzle-orm";
import { getFacultyWorkloadAnalytics } from "~/services/workload.server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  const activeVersion =
    (await db.query.timetableVersions.findFirst({
      where: eq(timetableVersions.status, "published"),
      orderBy: (tv, { desc }) => [desc(tv.updatedAt)],
      with: {
        academicYear: true,
        semester: true,
        entries: {
          with: {
            class: true,
            subject: true,
            faculty: true,
            classroom: true,
            day: true,
            period: true,
          },
        },
      },
    })) ||
    (await db.query.timetableVersions.findFirst({
      orderBy: (tv, { desc }) => [desc(tv.createdAt)],
      with: {
        academicYear: true,
        semester: true,
        entries: {
          with: {
            class: true,
            subject: true,
            faculty: true,
            classroom: true,
            day: true,
            period: true,
          },
        },
      },
    }));

  const analytics = await getFacultyWorkloadAnalytics(activeVersion?.id);

  return { user, activeVersion, analytics };
}

export default function ReportsPage() {
  const { activeVersion, analytics } = useLoaderData<typeof loader>();

  const downloadMasterTimetableCSV = () => {
    if (!activeVersion || activeVersion.entries.length === 0) return;

    const headers = [
      "Semester",
      "Day",
      "Period",
      "Time Range",
      "Class Section",
      "Subject Code",
      "Subject Title",
      "Assigned Faculty",
      "Classroom",
    ];

    const rows = activeVersion.entries.map((e: any) => [
      `"${activeVersion.semester?.name || "Semester"}"`,
      `"${e.day.dayName}"`,
      `"${e.period.name}"`,
      `"${e.period.startTime} - ${e.period.endTime}"`,
      `"${e.class.name}"`,
      `"${e.subject.code}"`,
      `"${e.subject.name}"`,
      `"${e.faculty.fullName}"`,
      `"${e.classroom.roomNumber}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `master-timetable-${activeVersion.name.toLowerCase().replace(/\s+/g, "-")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadWorkloadCSV = () => {
    const headers = [
      "Faculty Name",
      "Employee ID",
      "Department",
      "Designation",
      "Assigned Hours/Week",
      "Max Allowed Hours",
      "Utilization %",
      "Status",
    ];

    const rows = analytics.facultyStats.map((f) => [
      `"${f.fullName}"`,
      `"${f.employeeId}"`,
      `"${f.department}"`,
      `"${f.designation}"`,
      f.assignedHours,
      f.maxWeeklyHours,
      `"${f.utilizationRate}%"`,
      `"${f.statusBadge}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `faculty-workload-audit.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadRoomUtilizationCSV = () => {
    const headers = [
      "Classroom",
      "Type",
      "Capacity",
      "Building",
      "Occupied Hours",
      "Total Available Slots",
      "Utilization %",
    ];

    const rows = analytics.roomStats.map((r) => [
      `"${r.roomNumber}"`,
      `"${r.roomType}"`,
      r.capacity,
      `"${r.building}"`,
      r.occupiedPeriods,
      r.totalSlots,
      `"${r.utilizationRate}%"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `room-utilization-report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            Academic Reports & Data Exports
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Export official scheduling sheets, faculty workload documentation, and room usage audits.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => window.print()}
          className="gap-2 shadow-xs"
        >
          <Printer className="h-4 w-4" />
          Print Current View
        </Button>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-blue-300 dark:hover:border-blue-800 transition-colors">
          <CardContent className="p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Master Timetable (CSV)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Complete spreadsheet with class, subject, instructor, and classroom allocations.
              </p>
            </div>
            <Button
              onClick={downloadMasterTimetableCSV}
              variant="outline"
              className="w-full gap-2 text-xs"
              disabled={!activeVersion || activeVersion.entries.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Export Master CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
          <CardContent className="p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Faculty Workload Audit (CSV)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Institutional documentation for faculty teaching hours, caps, and department metrics.
              </p>
            </div>
            <Button
              onClick={downloadWorkloadCSV}
              variant="outline"
              className="w-full gap-2 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export Workload CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:border-purple-300 dark:hover:border-purple-800 transition-colors">
          <CardContent className="p-6 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
              <DoorOpen className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">Facility Utilization Audit (CSV)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Occupancy percentages, room type utilization, and capacity analysis for campus planning.
              </p>
            </div>
            <Button
              onClick={downloadRoomUtilizationCSV}
              variant="outline"
              className="w-full gap-2 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export Utilization CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Snapshot Summary Tables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campus Facility Utilization Roster</CardTitle>
          <CardDescription>
            Audit of instructional spaces across the academic week
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Classroom</th>
                  <th className="p-4">Facility Type</th>
                  <th className="p-4">Seating Capacity</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Occupied Hours</th>
                  <th className="p-4">Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {analytics.roomStats.map((rm) => (
                  <tr key={rm.roomId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {rm.roomNumber}
                    </td>
                    <td className="p-4">
                      <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {rm.roomType}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-slate-800 dark:text-slate-200">
                      {rm.capacity} Seats
                    </td>
                    <td className="p-4 text-xs text-slate-500">
                      {rm.building}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {rm.occupiedPeriods} / {rm.totalSlots} Slots
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {rm.utilizationRate}%
                        </span>
                        <div className="w-20 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full"
                            style={{ width: `${rm.utilizationRate}%` }}
                          />
                        </div>
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
