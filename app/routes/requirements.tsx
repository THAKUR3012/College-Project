import { useState } from "react";
import {
  useLoaderData,
  useSubmit,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { ClipboardList, Plus, Edit2, Trash2, BookOpen, User, GraduationCap, MapPin } from "lucide-react";
import { requireRole } from "~/services/auth.server";
import { db } from "~/db/index.server";
import {
  teachingRequirements,
  classes,
  subjects,
  faculty,
  classrooms,
} from "~/db/schema/index";
import { eq } from "drizzle-orm";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input, Label } from "~/components/ui/input";
import { Modal } from "~/components/ui/modal";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);

  const requirementsList = await db.query.teachingRequirements.findMany({
    with: {
      class: true,
      subject: true,
      faculty: true,
      preferredRoom: true,
    },
    orderBy: (tr, { asc }) => [asc(tr.classId)],
  });

  const classesList = await db.query.classes.findMany({
    orderBy: (c, { asc }) => [asc(c.name)],
  });

  const subjectsList = await db.query.subjects.findMany({
    orderBy: (s, { asc }) => [asc(s.code)],
  });

  const facultyList = await db.query.faculty.findMany({
    where: eq(faculty.isActive, true),
    orderBy: (f, { asc }) => [asc(f.fullName)],
  });

  const roomsList = await db.query.classrooms.findMany({
    where: eq(classrooms.isActive, true),
    orderBy: (r, { asc }) => [asc(r.roomNumber)],
  });

  return { user, requirementsList, classesList, subjectsList, facultyList, roomsList };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "create") {
    const classId = Number(formData.get("classId"));
    const subjectId = Number(formData.get("subjectId"));
    const facultyId = Number(formData.get("facultyId"));
    const weeklySessionsRequired = Number(formData.get("weeklySessionsRequired")) || 4;
    const consecutivePeriods = Number(formData.get("consecutivePeriods")) || 1;
    const preferredRoomId = formData.get("preferredRoomId")
      ? Number(formData.get("preferredRoomId"))
      : null;

    try {
      await db.insert(teachingRequirements).values({
        classId,
        subjectId,
        facultyId,
        weeklySessionsRequired,
        consecutivePeriods,
        preferredRoomId,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "update") {
    const id = Number(formData.get("id"));
    const classId = Number(formData.get("classId"));
    const subjectId = Number(formData.get("subjectId"));
    const facultyId = Number(formData.get("facultyId"));
    const weeklySessionsRequired = Number(formData.get("weeklySessionsRequired"));
    const consecutivePeriods = Number(formData.get("consecutivePeriods"));
    const preferredRoomId = formData.get("preferredRoomId")
      ? Number(formData.get("preferredRoomId"))
      : null;

    try {
      await db
        .update(teachingRequirements)
        .set({
          classId,
          subjectId,
          facultyId,
          weeklySessionsRequired,
          consecutivePeriods,
          preferredRoomId,
        })
        .where(eq(teachingRequirements.id, id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "delete") {
    const id = Number(formData.get("id"));
    try {
      await db.delete(teachingRequirements).where(eq(teachingRequirements.id, id));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: "Invalid action" };
}

export default function RequirementsPage() {
  const { requirementsList, classesList, subjectsList, facultyList, roomsList } =
    useLoaderData<typeof loader>();
  const submit = useSubmit();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingReq, setEditingReq] = useState<any | null>(null);

  const [classId, setClassId] = useState<number>(classesList[0]?.id || 1);
  const [subjectId, setSubjectId] = useState<number>(subjectsList[0]?.id || 1);
  const [facultyId, setFacultyId] = useState<number>(facultyList[0]?.id || 1);
  const [weeklySessionsRequired, setWeeklySessionsRequired] = useState(4);
  const [consecutivePeriods, setConsecutivePeriods] = useState(1);
  const [preferredRoomId, setPreferredRoomId] = useState<number | null>(roomsList[0]?.id || null);

  const openCreateModal = () => {
    setEditingReq(null);
    setClassId(classesList[0]?.id || 1);
    setSubjectId(subjectsList[0]?.id || 1);
    setFacultyId(facultyList[0]?.id || 1);
    setWeeklySessionsRequired(4);
    setConsecutivePeriods(1);
    setPreferredRoomId(roomsList[0]?.id || null);
    setModalOpen(true);
  };

  const openEditModal = (req: any) => {
    setEditingReq(req);
    setClassId(req.classId);
    setSubjectId(req.subjectId);
    setFacultyId(req.facultyId);
    setWeeklySessionsRequired(req.weeklySessionsRequired);
    setConsecutivePeriods(req.consecutivePeriods);
    setPreferredRoomId(req.preferredRoomId);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("intent", editingReq ? "update" : "create");
    if (editingReq) formData.append("id", editingReq.id.toString());
    formData.append("classId", classId.toString());
    formData.append("subjectId", subjectId.toString());
    formData.append("facultyId", facultyId.toString());
    formData.append("weeklySessionsRequired", weeklySessionsRequired.toString());
    formData.append("consecutivePeriods", consecutivePeriods.toString());
    if (preferredRoomId) formData.append("preferredRoomId", preferredRoomId.toString());

    submit(formData, { method: "post" });
    setModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to remove this teaching requirement?")) return;
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id.toString());
    submit(formData, { method: "post" });
  };

  const totalRequiredHours = requirementsList.reduce(
    (sum, r) => sum + r.weeklySessionsRequired,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600" />
            Curriculum Teaching Requirements
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Specify which faculty member teaches which subject to which class, along with weekly required hours.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs font-semibold text-blue-700 dark:text-blue-300">
            Total Demand: {totalRequiredHours} Hours/Week
          </div>
          <Button onClick={openCreateModal} className="gap-2 shadow-md shadow-blue-500/20">
            <Plus className="h-4 w-4" />
            Add Requirement
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Target Class</th>
                  <th className="p-4">Subject</th>
                  <th className="p-4">Assigned Instructor</th>
                  <th className="p-4">Sessions / Week</th>
                  <th className="p-4">Consecutive Block</th>
                  <th className="p-4">Preferred Facility</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requirementsList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-500 dark:text-slate-400 text-sm">
                      No teaching requirements configured yet. Click &quot;Add Requirement&quot; to assign faculty and subjects to classes.
                    </td>
                  </tr>
                ) : (
                  requirementsList.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-blue-500" />
                        <span>{req.class.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {req.subject.code}
                      </div>
                      <div className="text-xs text-slate-400">{req.subject.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{req.faculty.fullName}</span>
                      </div>
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                      {req.weeklySessionsRequired} periods/wk
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      {req.consecutivePeriods === 2 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          2 Periods (Practical Block)
                        </span>
                      ) : (
                        "1 Period"
                      )}
                    </td>
                    <td className="p-4 text-xs">
                      {req.preferredRoom ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {req.preferredRoom.roomNumber} ({req.preferredRoom.roomType})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Auto-allocate</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(req)}
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(req.id)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Requirement Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingReq ? "Edit Teaching Requirement" : "Add Teaching Requirement"}
        description="Allocate curriculum subject hours and instructor to a student class."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="req-class">Target Class Section</Label>
              <select
                id="req-class"
                value={classId}
                onChange={(e) => setClassId(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {classesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.studentCount} students)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-sub">Curriculum Subject</Label>
              <select
                id="req-sub"
                value={subjectId}
                onChange={(e) => {
                  const sId = Number(e.target.value);
                  setSubjectId(sId);
                  const sub = subjectsList.find((s) => s.id === sId);
                  if (sub?.type === "practical") {
                    setConsecutivePeriods(2);
                  } else {
                    setConsecutivePeriods(1);
                  }
                }}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {subjectsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name} ({s.type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-fac">Assigned Faculty Instructor</Label>
            <select
              id="req-fac"
              value={facultyId}
              onChange={(e) => setFacultyId(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName} ({f.department}) &bull; Max: {f.maxWeeklyHours} hrs
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="req-hours">Weekly Sessions Required</Label>
              <Input
                id="req-hours"
                type="number"
                min="1"
                max="10"
                value={weeklySessionsRequired}
                onChange={(e) => setWeeklySessionsRequired(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="req-consec">Consecutive Periods Block</Label>
              <select
                id="req-consec"
                value={consecutivePeriods}
                onChange={(e) => setConsecutivePeriods(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="1">1 Period (Theory Lecture)</option>
                <option value="2">2 Consecutive Periods (Lab Practical)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="req-room">Preferred Classroom / Lab</Label>
            <select
              id="req-room"
              value={preferredRoomId || ""}
              onChange={(e) => setPreferredRoomId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">Auto-allocate based on capacity & room type</option>
              {roomsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.roomType.toUpperCase()}, {r.capacity} seats)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingReq ? "Save Changes" : "Save Requirement"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
