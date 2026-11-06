import { useState } from "react";
import {
  useLoaderData,
  useSubmit,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { GraduationCap, Plus, Edit2, Trash2, Users, BookOpen } from "lucide-react";
import { requireRole } from "~/services/auth.server";
import { getAllClasses, createClass, updateClass, deleteClass } from "~/services/class.server";
import { db } from "~/db/index.server";
import { courses, semesters, academicYears } from "~/db/schema/index";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input, Label } from "~/components/ui/input";
import { Modal } from "~/components/ui/modal";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const classesList = await getAllClasses();
  const allCourses = await db.query.courses.findMany();
  const allSemesters = await db.query.semesters.findMany();
  const allYears = await db.query.academicYears.findMany();

  return { user, classesList, allCourses, allSemesters, allYears };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "create") {
    const name = formData.get("name")?.toString() || "";
    const section = formData.get("section")?.toString() || "A";
    const studentCount = Number(formData.get("studentCount")) || 50;
    const courseId = Number(formData.get("courseId")) || 1;
    const semesterId = Number(formData.get("semesterId")) || 1;
    const academicYearId = Number(formData.get("academicYearId")) || 1;

    try {
      await createClass({
        name,
        section,
        studentCount,
        courseId,
        semesterId,
        academicYearId,
        userId: user.id,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "update") {
    const id = Number(formData.get("id"));
    const name = formData.get("name")?.toString();
    const section = formData.get("section")?.toString();
    const studentCount = Number(formData.get("studentCount"));
    const courseId = Number(formData.get("courseId"));
    const semesterId = Number(formData.get("semesterId"));
    const academicYearId = Number(formData.get("academicYearId"));

    try {
      await updateClass(id, {
        name,
        section,
        studentCount,
        courseId,
        semesterId,
        academicYearId,
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
      await deleteClass(id, user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: "Invalid action" };
}

export default function ClassesPage() {
  const { classesList, allCourses, allSemesters, allYears } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [section, setSection] = useState("A");
  const [studentCount, setStudentCount] = useState(50);
  const [courseId, setCourseId] = useState<number>(allCourses[0]?.id || 1);
  const [semesterId, setSemesterId] = useState<number>(allSemesters[0]?.id || 1);
  const [academicYearId, setAcademicYearId] = useState<number>(allYears[0]?.id || 1);

  const openCreateModal = () => {
    setEditingClass(null);
    setName("CSE-3C");
    setSection("C");
    setStudentCount(50);
    setCourseId(allCourses[0]?.id || 1);
    setSemesterId(allSemesters[0]?.id || 1);
    setAcademicYearId(allYears[0]?.id || 1);
    setModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingClass(c);
    setName(c.name);
    setSection(c.section);
    setStudentCount(c.studentCount);
    setCourseId(c.courseId);
    setSemesterId(c.semesterId);
    setAcademicYearId(c.academicYearId);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("intent", editingClass ? "update" : "create");
    if (editingClass) formData.append("id", editingClass.id.toString());
    formData.append("name", name);
    formData.append("section", section);
    formData.append("studentCount", studentCount.toString());
    formData.append("courseId", courseId.toString());
    formData.append("semesterId", semesterId.toString());
    formData.append("academicYearId", academicYearId.toString());

    submit(formData, { method: "post" });
    setModalOpen(false);
  };

  const handleDelete = (id: number, className: string) => {
    if (!confirm(`Are you sure you want to delete class ${className}?`)) return;
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
            <GraduationCap className="h-6 w-6 text-blue-600" />
            Class Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Student cohort sections, enrollment sizes, and curriculum term links.
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2 shadow-md shadow-blue-500/20">
          <Plus className="h-4 w-4" />
          Add Class Section
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Class / Section</th>
                  <th className="p-4">Degree & Department</th>
                  <th className="p-4">Term & Semester</th>
                  <th className="p-4">Student Enrollment</th>
                  <th className="p-4">Requirements</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {classesList.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white text-base">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-400">Section {c.section}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {c.course?.name}
                      </div>
                      <div className="text-xs text-slate-400">{c.course?.department}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {c.semester?.name}
                      </div>
                      <div className="text-xs text-slate-400">{c.academicYear?.name}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>{c.studentCount} Students</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Classroom capacity requirement</div>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-1 text-xs font-semibold">
                        <BookOpen className="h-3.5 w-3.5" />
                        {c.requirements?.length ?? 0} Subjects Configured
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(c)}
                          title="Edit Class"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(c.id, c.name)}
                          title="Delete Class"
                          className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Class Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClass ? "Edit Class Section" : "Create Class Section"}
        description="Set class identifiers, batch size, and semester mappings."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cls-name">Class Name</Label>
              <Input
                id="cls-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CSE-3A"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cls-sec">Section</Label>
              <Input
                id="cls-sec"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="A"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cls-count">Student Enrollment Count</Label>
            <Input
              id="cls-count"
              type="number"
              min="10"
              max="200"
              value={studentCount}
              onChange={(e) => setStudentCount(Number(e.target.value))}
              required
            />
            <p className="text-[11px] text-slate-400">Classrooms assigned must have capacity equal or higher</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cls-course">Degree Course</Label>
              <select
                id="cls-course"
                value={courseId}
                onChange={(e) => setCourseId(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
              >
                {allCourses.map((crs) => (
                  <option key={crs.id} value={crs.id}>
                    {crs.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cls-sem">Semester</Label>
              <select
                id="cls-sem"
                value={semesterId}
                onChange={(e) => setSemesterId(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
              >
                {allSemesters.map((s) => (
                  <option key={s.id} value={s.id}>
                    Sem {s.number}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cls-yr">Academic Year</Label>
              <select
                id="cls-yr"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs"
              >
                {allYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingClass ? "Save Changes" : "Create Class"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
