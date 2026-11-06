import { useState } from "react";
import {
  useLoaderData,
  useSubmit,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  Building,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import { requireRole } from "~/services/auth.server";
import { getAllFaculty, createFaculty, updateFaculty, deleteFaculty } from "~/services/faculty.server";
import { getAllSubjects } from "~/services/subject.server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input, Label } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Modal } from "~/components/ui/modal";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const facultyList = await getAllFaculty();
  const subjectsList = await getAllSubjects();
  return { user, facultyList, subjectsList };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "create") {
    const fullName = formData.get("fullName")?.toString() || "";
    const email = formData.get("email")?.toString() || "";
    const employeeId = formData.get("employeeId")?.toString() || "";
    const department = formData.get("department")?.toString() || "";
    const designation = formData.get("designation")?.toString() || "";
    const maxWeeklyHours = Number(formData.get("maxWeeklyHours")) || 18;
    const maxConsecutiveHours = Number(formData.get("maxConsecutiveHours")) || 3;
    const subjectIds = formData.getAll("subjectIds").map(Number);

    try {
      await createFaculty({
        fullName,
        email,
        employeeId,
        department,
        designation,
        maxWeeklyHours,
        maxConsecutiveHours,
        subjectIds,
        adminUserId: user.id,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "update") {
    const id = Number(formData.get("id"));
    const fullName = formData.get("fullName")?.toString();
    const email = formData.get("email")?.toString();
    const department = formData.get("department")?.toString();
    const designation = formData.get("designation")?.toString();
    const maxWeeklyHours = Number(formData.get("maxWeeklyHours"));
    const maxConsecutiveHours = Number(formData.get("maxConsecutiveHours"));
    const subjectIds = formData.getAll("subjectIds").map(Number);

    try {
      await updateFaculty(id, {
        fullName,
        email,
        department,
        designation,
        maxWeeklyHours,
        maxConsecutiveHours,
        subjectIds,
        adminUserId: user.id,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "delete") {
    const id = Number(formData.get("id"));
    try {
      await deleteFaculty(id, user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: "Invalid action" };
}

export default function FacultyPage() {
  const { facultyList, subjectsList } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<any | null>(null);

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [department, setDepartment] = useState("Computer Science");
  const [designation, setDesignation] = useState("Assistant Professor");
  const [maxWeeklyHours, setMaxWeeklyHours] = useState(20);
  const [maxConsecutiveHours, setMaxConsecutiveHours] = useState(3);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);

  const openCreateModal = () => {
    setEditingFaculty(null);
    setFullName("");
    setEmail("");
    setEmployeeId(`FAC-${Math.floor(100 + Math.random() * 900)}`);
    setDepartment("Computer Science");
    setDesignation("Assistant Professor");
    setMaxWeeklyHours(20);
    setMaxConsecutiveHours(3);
    setSelectedSubjects([]);
    setModalOpen(true);
  };

  const openEditModal = (fac: any) => {
    setEditingFaculty(fac);
    setFullName(fac.fullName);
    setEmail(fac.email);
    setEmployeeId(fac.employeeId);
    setDepartment(fac.department);
    setDesignation(fac.designation);
    setMaxWeeklyHours(fac.maxWeeklyHours);
    setMaxConsecutiveHours(fac.maxConsecutiveHours);
    setSelectedSubjects(fac.facultySubjects.map((fs: any) => fs.subjectId));
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("intent", editingFaculty ? "update" : "create");
    if (editingFaculty) formData.append("id", editingFaculty.id.toString());
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("employeeId", employeeId);
    formData.append("department", department);
    formData.append("designation", designation);
    formData.append("maxWeeklyHours", maxWeeklyHours.toString());
    formData.append("maxConsecutiveHours", maxConsecutiveHours.toString());
    selectedSubjects.forEach((subId) => formData.append("subjectIds", subId.toString()));

    submit(formData, { method: "post" });
    setModalOpen(false);
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Are you sure you want to remove faculty member ${name}?`)) return;
    const formData = new FormData();
    formData.append("intent", "delete");
    formData.append("id", id.toString());
    submit(formData, { method: "post" });
  };

  // Filtered faculty
  const filteredFaculty = facultyList.filter((fac) => {
    const matchesSearch =
      fac.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === "all" || fac.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(facultyList.map((f) => f.department)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            Faculty Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage academic instructors, teaching qualifications, and weekly contractual workload caps.
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2 shadow-md shadow-blue-500/20">
          <Plus className="h-4 w-4" />
          Add Faculty Member
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-72">
          <Input
            placeholder="Search faculty by name, ID or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label htmlFor="deptFilter" className="text-xs font-semibold text-slate-500">Department:</label>
          <select
            id="deptFilter"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-xs"
          >
            <option value="all">All Departments ({facultyList.length})</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Faculty Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Faculty Name & ID</th>
                  <th className="p-4">Department & Designation</th>
                  <th className="p-4">Workload Limit</th>
                  <th className="p-4">Qualified Subjects</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredFaculty.map((fac) => (
                  <tr key={fac.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {fac.fullName}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-500">{fac.employeeId}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {fac.email}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {fac.designation}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building className="h-3 w-3" />
                        {fac.department}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {fac.maxWeeklyHours} hrs/week
                      </div>
                      <div className="text-xs text-slate-400">
                        Max {fac.maxConsecutiveHours} consec. hrs
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {fac.facultySubjects && fac.facultySubjects.length > 0 ? (
                          fac.facultySubjects.map((fs: any) => (
                            <span
                              key={fs.id}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-medium"
                            >
                              {fs.subject.code}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">None assigned</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={fac.isActive ? "success" : "secondary"}>
                        {fac.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(fac)}
                          title="Edit Faculty"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(fac.id, fac.fullName)}
                          title="Delete Faculty"
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

      {/* Faculty Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFaculty ? "Edit Faculty Member" : "Add New Faculty"}
        description="Configure academic faculty profile, workload ceilings, and subject competencies."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fac-name">Full Name</Label>
              <Input
                id="fac-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. John Doe"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fac-email">Institutional Email</Label>
              <Input
                id="fac-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="johndoe@college.edu"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fac-empid">Employee ID</Label>
              <Input
                id="fac-empid"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fac-dept">Department</Label>
              <Input
                id="fac-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fac-desig">Designation</Label>
              <Input
                id="fac-desig"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fac-maxhrs">Max Weekly Teaching Hours</Label>
              <Input
                id="fac-maxhrs"
                type="number"
                min="6"
                max="35"
                value={maxWeeklyHours}
                onChange={(e) => setMaxWeeklyHours(Number(e.target.value))}
                required
              />
              <p className="text-[11px] text-slate-400">Strictly enforced by solver algorithm</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fac-consec">Max Consecutive Hours</Label>
              <Input
                id="fac-consec"
                type="number"
                min="1"
                max="5"
                value={maxConsecutiveHours}
                onChange={(e) => setMaxConsecutiveHours(Number(e.target.value))}
                required
              />
              <p className="text-[11px] text-slate-400">Avoids faculty fatigue</p>
            </div>
          </div>

          {/* Qualified Subject Selection */}
          <div className="space-y-1.5">
            <Label>Qualified Subjects</Label>
            <div className="max-h-36 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 p-2 space-y-1">
              {subjectsList.map((sub) => {
                const checked = selectedSubjects.includes(sub.id);
                return (
                  <label
                    key={sub.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSubjects([...selectedSubjects, sub.id]);
                        } else {
                          setSelectedSubjects(selectedSubjects.filter((id) => id !== sub.id));
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {sub.code}
                    </span>
                    <span className="text-slate-500 truncate">{sub.name}</span>
                    <span className="text-[10px] uppercase text-slate-400 ml-auto">
                      {sub.type}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingFaculty ? "Save Changes" : "Create Faculty"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
