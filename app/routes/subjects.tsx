import { useState } from "react";
import {
  useLoaderData,
  useSubmit,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { BookOpen, Plus, Edit2, Trash2, Layers, Clock } from "lucide-react";
import { requireRole } from "~/services/auth.server";
import { getAllSubjects, createSubject, updateSubject, deleteSubject } from "~/services/subject.server";
import { db } from "~/db/index.server";
import { courses, semesters } from "~/db/schema/index";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input, Label } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Modal } from "~/components/ui/modal";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const subjectsList = await getAllSubjects();
  const allCourses = await db.query.courses.findMany();
  const allSemesters = await db.query.semesters.findMany();

  return { user, subjectsList, allCourses, allSemesters };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "create") {
    const code = formData.get("code")?.toString() || "";
    const name = formData.get("name")?.toString() || "";
    const type = (formData.get("type")?.toString() || "theory") as any;
    const weeklySessions = Number(formData.get("weeklySessions")) || 4;
    const consecutiveSlotsRequired = Number(formData.get("consecutiveSlotsRequired")) || 1;
    const requiredRoomType = (formData.get("requiredRoomType")?.toString() || "lecture") as any;
    const colorCode = formData.get("colorCode")?.toString() || "#3b82f6";
    const courseId = Number(formData.get("courseId")) || 1;
    const semesterId = Number(formData.get("semesterId")) || 1;

    try {
      await createSubject({
        code,
        name,
        type,
        weeklySessions,
        consecutiveSlotsRequired,
        requiredRoomType,
        colorCode,
        courseId,
        semesterId,
        userId: user.id,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "update") {
    const id = Number(formData.get("id"));
    const code = formData.get("code")?.toString();
    const name = formData.get("name")?.toString();
    const type = formData.get("type")?.toString() as any;
    const weeklySessions = Number(formData.get("weeklySessions"));
    const consecutiveSlotsRequired = Number(formData.get("consecutiveSlotsRequired"));
    const requiredRoomType = formData.get("requiredRoomType")?.toString() as any;
    const colorCode = formData.get("colorCode")?.toString();
    const courseId = Number(formData.get("courseId"));
    const semesterId = Number(formData.get("semesterId"));

    try {
      await updateSubject(id, {
        code,
        name,
        type,
        weeklySessions,
        consecutiveSlotsRequired,
        requiredRoomType,
        colorCode,
        courseId,
        semesterId,
        userId: user.id,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "delete") {
    const id = Number(formData.get("id"));
    try {
      await deleteSubject(id, user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: "Invalid action" };
}

export default function SubjectsPage() {
  const { subjectsList, allCourses, allSemesters } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any | null>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"theory" | "practical" | "seminar">("theory");
  const [weeklySessions, setWeeklySessions] = useState(4);
  const [consecutiveSlotsRequired, setConsecutiveSlotsRequired] = useState(1);
  const [requiredRoomType, setRequiredRoomType] = useState<"lecture" | "lab" | "seminar">("lecture");
  const [colorCode, setColorCode] = useState("#3b82f6");
  const [courseId, setCourseId] = useState<number>(allCourses[0]?.id || 1);
  const [semesterId, setSemesterId] = useState<number>(allSemesters[0]?.id || 1);

  const openCreateModal = () => {
    setEditingSubject(null);
    setCode("CS" + Math.floor(300 + Math.random() * 500));
    setName("");
    setType("theory");
    setWeeklySessions(4);
    setConsecutiveSlotsRequired(1);
    setRequiredRoomType("lecture");
    setColorCode("#3b82f6");
    setCourseId(allCourses[0]?.id || 1);
    setSemesterId(allSemesters[0]?.id || 1);
    setModalOpen(true);
  };

  const openEditModal = (s: any) => {
    setEditingSubject(s);
    setCode(s.code);
    setName(s.name);
    setType(s.type);
    setWeeklySessions(s.weeklySessions);
    setConsecutiveSlotsRequired(s.consecutiveSlotsRequired);
    setRequiredRoomType(s.requiredRoomType);
    setColorCode(s.colorCode);
    setCourseId(s.courseId);
    setSemesterId(s.semesterId);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("intent", editingSubject ? "update" : "create");
    if (editingSubject) formData.append("id", editingSubject.id.toString());
    formData.append("code", code);
    formData.append("name", name);
    formData.append("type", type);
    formData.append("weeklySessions", weeklySessions.toString());
    formData.append("consecutiveSlotsRequired", consecutiveSlotsRequired.toString());
    formData.append("requiredRoomType", requiredRoomType);
    formData.append("colorCode", colorCode);
    formData.append("courseId", courseId.toString());
    formData.append("semesterId", semesterId.toString());

    submit(formData, { method: "post" });
    setModalOpen(false);
  };

  const handleDelete = (id: number, code: string) => {
    if (!confirm(`Are you sure you want to delete subject ${code}?`)) return;
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id.toString());
    submit(formData, { method: "post" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Subject Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Curriculum subject codes, weekly session requirements, and consecutive block specifications.
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2 shadow-md shadow-blue-500/20">
          <Plus className="h-4 w-4" />
          Add Subject
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Subject Code & Name</th>
                  <th className="p-4">Pedagogical Type</th>
                  <th className="p-4">Weekly Sessions</th>
                  <th className="p-4">Consecutive Slots</th>
                  <th className="p-4">Facility Type</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {subjectsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500 dark:text-slate-400 text-sm">
                      No subjects added yet. Click &quot;Add Subject&quot; to create your curriculum subjects.
                    </td>
                  </tr>
                ) : (
                  subjectsList.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-3.5 w-3.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: s.colorCode || "#3b82f6" }}
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {s.code}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {s.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          s.type === "practical"
                            ? "success"
                            : s.type === "seminar"
                            ? "secondary"
                            : "default"
                        }
                        className="uppercase text-[11px]"
                      >
                        {s.type}
                      </Badge>
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {s.weeklySessions} periods/week
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        {s.consecutiveSlotsRequired === 2 ? (
                          <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                            2 Consecutive (Lab Block)
                          </strong>
                        ) : (
                          "1 Single Period"
                        )}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="capitalize font-medium text-slate-800 dark:text-slate-200">
                        {s.requiredRoomType}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(s)}
                          title="Edit Subject"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(s.id, s.code)}
                          title="Delete Subject"
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

      {/* Subject Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSubject ? "Edit Subject" : "Create New Subject"}
        description="Configure curriculum subject parameters and room constraints."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sub-code">Subject Code</Label>
              <Input
                id="sub-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CS301"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-color">Display Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="sub-color"
                  type="color"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                  className="h-9 w-12 rounded border p-1 cursor-pointer"
                />
                <Input
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-name">Subject Name</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-type">Subject Type</Label>
              <select
                id="sub-type"
                value={type}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setType(val);
                  if (val === "practical") {
                    setConsecutiveSlotsRequired(2);
                    setRequiredRoomType("lab");
                  } else if (val === "seminar") {
                    setRequiredRoomType("seminar");
                  } else {
                    setConsecutiveSlotsRequired(1);
                    setRequiredRoomType("lecture");
                  }
                }}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
              >
                <option value="theory">Theory Lecture</option>
                <option value="practical">Practical Laboratory</option>
                <option value="seminar">Seminar / Presentation</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-sessions">Weekly Sessions</Label>
              <Input
                id="sub-sessions"
                type="number"
                min="1"
                max="10"
                value={weeklySessions}
                onChange={(e) => setWeeklySessions(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-consec">Consecutive Slots</Label>
              <select
                id="sub-consec"
                value={consecutiveSlotsRequired}
                onChange={(e) => setConsecutiveSlotsRequired(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
              >
                <option value="1">1 Period (Standard)</option>
                <option value="2">2 Consecutive Periods (Lab)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-roomtype">Required Facility Room Type</Label>
            <select
              id="sub-roomtype"
              value={requiredRoomType}
              onChange={(e) => setRequiredRoomType(e.target.value as any)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
            >
              <option value="lecture">Lecture Hall</option>
              <option value="lab">Computer / Hardware Laboratory</option>
              <option value="seminar">Seminar Hall</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingSubject ? "Save Changes" : "Create Subject"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
