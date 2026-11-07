import { useState } from "react";
import {
  useLoaderData,
  useSubmit,
  Link,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  FileCheck,
  History,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";
import { requireUser } from "~/services/auth.server";
import { db } from "~/db/index.server";
import {
  timetableVersions,
  timetableEntries,
  classes,
  faculty,
  classrooms,
  subjects,
  workingDays,
  periods,
} from "~/db/schema/index";
import { eq, desc } from "drizzle-orm";
import {
  getTimetableVersionById,
  publishTimetableVersion,
  manualEditTimetableSlot,
  deleteTimetableEntry,
} from "~/services/timetable.server";
import { TimetableGrid } from "~/components/timetable/TimetableGrid";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent } from "~/components/ui/card";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);
  const versionParam = url.searchParams.get("versionId");
  const viewParam = url.searchParams.get("view") as "class" | "faculty" | "room" | "date" | null;
  const dateParam = url.searchParams.get("date");

  const allVersions = await db.query.timetableVersions.findMany({
    orderBy: (tv, { desc }) => [desc(tv.createdAt)],
  });

  let selectedVersionId: number | null = null;
  if (versionParam) {
    selectedVersionId = Number(versionParam);
  } else {
    // Pick published first, or first available
    const published = allVersions.find((v) => v.status === "published");
    selectedVersionId = published ? published.id : allVersions[0]?.id || null;
  }

  const versionData = selectedVersionId
    ? await getTimetableVersionById(selectedVersionId)
    : null;

  const daysList = await db.query.workingDays.findMany({
    where: eq(workingDays.isActive, true),
    orderBy: (d, { asc }) => [asc(d.dayOrder)],
  });

  const periodsList = await db.query.periods.findMany({
    where: eq(periods.isBreak, false),
    orderBy: (p, { asc }) => [asc(p.periodNumber)],
  });

  const classesList = await db.query.classes.findMany({
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  const facultyList = await db.query.faculty.findMany({
    where: eq(faculty.isActive, true),
    orderBy: (f, { asc }) => [asc(f.fullName)],
  });

  const roomsList = await db.query.classrooms.findMany({
    where: eq(classrooms.isActive, true),
    orderBy: (r, { asc }) => [asc(r.roomNumber)],
  });

  const subjectsList = await db.query.subjects.findMany({
    orderBy: (s, { asc }) => [asc(s.code)],
  });

  return {
    user,
    allVersions,
    versionData,
    daysList,
    periodsList,
    classesList,
    facultyList,
    roomsList,
    subjectsList,
    initialView: viewParam,
    initialDate: dateParam,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "publish") {
    const versionId = Number(formData.get("versionId"));
    try {
      await publishTimetableVersion(versionId, user.id);
      return { success: true, message: "Timetable published successfully!" };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "manual_edit") {
    const versionId = Number(formData.get("versionId"));
    const entryId = formData.get("entryId") ? Number(formData.get("entryId")) : undefined;
    const classId = Number(formData.get("classId"));
    const subjectId = Number(formData.get("subjectId"));
    const facultyId = Number(formData.get("facultyId"));
    const classroomId = Number(formData.get("classroomId"));
    const dayId = Number(formData.get("dayId"));
    const periodId = Number(formData.get("periodId"));

    try {
      await manualEditTimetableSlot({
        versionId,
        entryId,
        classId,
        subjectId,
        facultyId,
        classroomId,
        dayId,
        periodId,
        userId: user.id,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "delete_entry") {
    const entryId = Number(formData.get("entryId"));
    try {
      await deleteTimetableEntry(entryId, user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: "Invalid intent" };
}

export default function TimetablePage() {
  const {
    user,
    allVersions,
    versionData,
    daysList,
    periodsList,
    classesList,
    facultyList,
    roomsList,
    subjectsList,
    initialView,
    initialDate,
  } = useLoaderData<typeof loader>();

  const submit = useSubmit();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleVersionChange = (newVersionId: string) => {
    setSearchParams({ versionId: newVersionId });
  };

  const handlePublish = (versionId: number) => {
    if (!confirm("Are you sure you want to publish this timetable? This will make it the active master schedule for all faculty and students.")) return;
    const formData = new FormData();
    formData.append("intent", "publish");
    formData.append("versionId", versionId.toString());
    submit(formData, { method: "post" });
  };

  const handleManualEditSubmit = async (data: any): Promise<{ success: boolean; error?: string }> => {
    const formData = new FormData();
    formData.append("intent", "manual_edit");
    formData.append("versionId", data.versionId.toString());
    if (data.entryId) formData.append("entryId", data.entryId.toString());
    formData.append("classId", data.classId.toString());
    formData.append("subjectId", data.subjectId.toString());
    formData.append("facultyId", data.facultyId.toString());
    formData.append("classroomId", data.classroomId.toString());
    formData.append("dayId", data.dayId.toString());
    formData.append("periodId", data.periodId.toString());
    if (data.date) formData.append("date", data.date.toString());

    submit(formData, { method: "post" });
    return { success: true };
  };

  const handleDeleteEntry = async (entryId: number) => {
    const formData = new FormData();
    formData.append("intent", "delete_entry");
    formData.append("entryId", entryId.toString());
    submit(formData, { method: "post" });
  };

  const isCoordinatorOrAdmin = user.role.name === "admin" || user.role.name === "coordinator";

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Timetable Schedules
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Interactive multi-dimensional schedule grid with Date-wise, Class-wise, Faculty-wise, and Classroom perspectives.
          </p>
        </div>

        {/* Version Switcher and Publish Button */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {allVersions.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="versionSelect" className="text-xs font-semibold text-slate-500">Version:</label>
              <select
                id="versionSelect"
                value={versionData?.id ?? allVersions[0].id}
                onChange={(e) => handleVersionChange(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-xs"
              >
                {allVersions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {versionData && (
            <Badge
              variant={
                versionData.status === "published"
                  ? "success"
                  : versionData.status === "draft"
                  ? "secondary"
                  : "outline"
              }
              className="capitalize text-xs font-semibold"
            >
              {versionData.status}
            </Badge>
          )}

          {/* Quick Date-wise / Weekly toggle shortcut */}
          <Button
            asChild
            size="sm"
            variant={initialView === "date" ? "default" : "outline"}
            className="gap-1.5"
          >
            <Link to={initialView === "date" ? "/timetable" : "/timetable?view=date"}>
              <Calendar className="h-3.5 w-3.5" />
              {initialView === "date" ? "Weekly Grid" : "Date-wise Schedule"}
            </Link>
          </Button>

          {isCoordinatorOrAdmin && versionData && versionData.status !== "published" && (
            <Button
              size="sm"
              onClick={() => handlePublish(versionData.id)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            >
              <FileCheck className="h-4 w-4" />
              Publish Version
            </Button>
          )}

          {isCoordinatorOrAdmin && (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link to="/timetable/generate">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Generate New
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Main Timetable Content */}
      {!versionData || versionData.entries.length === 0 ? (
        <Card className="text-center p-12 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <Calendar className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No Timetable Sessions Scheduled Yet
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Use the automated generation engine to create a feasible, conflict-free timetable across classes, faculty, and rooms.
            </p>
          </div>
          {isCoordinatorOrAdmin && (
            <Button asChild className="gap-2 shadow-md shadow-blue-500/20">
              <Link to="/timetable/generate">
                <Sparkles className="h-4 w-4" />
                Launch Timetable Generator
              </Link>
            </Button>
          )}
        </Card>
      ) : (
        <TimetableGrid
          entries={versionData.entries as any}
          days={daysList}
          periods={periodsList}
          classes={classesList}
          facultyList={facultyList}
          rooms={roomsList}
          subjects={subjectsList}
          isEditable={isCoordinatorOrAdmin}
          versionId={versionData.id}
          initialView={initialView || undefined}
          initialDate={initialDate || undefined}
          onManualEditSubmit={handleManualEditSubmit}
          onDeleteEntry={handleDeleteEntry}
        />
      )}
    </div>
  );
}
