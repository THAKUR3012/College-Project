import { useState } from "react";
import {
  useLoaderData,
  useSubmit,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { DoorOpen, Plus, Edit2, Trash2, Users, Building, ShieldCheck } from "lucide-react";
import { requireRole } from "~/services/auth.server";
import { getAllClassrooms, createClassroom, updateClassroom, deleteClassroom } from "~/services/classroom.server";
import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input, Label } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Modal } from "~/components/ui/modal";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const classroomsList = await getAllClassrooms();
  return { user, classroomsList };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireRole(request, ["admin", "coordinator"]);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "create") {
    const roomNumber = formData.get("roomNumber")?.toString() || "";
    const building = formData.get("building")?.toString() || "";
    const floor = Number(formData.get("floor")) || 1;
    const capacity = Number(formData.get("capacity")) || 60;
    const roomType = (formData.get("roomType")?.toString() || "lecture") as any;

    try {
      await createClassroom({
        roomNumber,
        building,
        floor,
        capacity,
        roomType,
        userId: user.id,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "update") {
    const id = Number(formData.get("id"));
    const roomNumber = formData.get("roomNumber")?.toString();
    const building = formData.get("building")?.toString();
    const floor = Number(formData.get("floor"));
    const capacity = Number(formData.get("capacity"));
    const roomType = formData.get("roomType")?.toString() as any;

    try {
      await updateClassroom(id, {
        roomNumber,
        building,
        floor,
        capacity,
        roomType,
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
      await deleteClassroom(id, user.id);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: "Invalid action" };
}

export default function ClassroomsPage() {
  const { classroomsList } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);

  const [roomNumber, setRoomNumber] = useState("");
  const [building, setBuilding] = useState("CS Block");
  const [floor, setFloor] = useState(1);
  const [capacity, setCapacity] = useState(65);
  const [roomType, setRoomType] = useState<"lecture" | "lab" | "seminar">("lecture");

  const openCreateModal = () => {
    setEditingRoom(null);
    setRoomNumber("LH-10" + Math.floor(3 + Math.random() * 5));
    setBuilding("CS Block");
    setFloor(1);
    setCapacity(65);
    setRoomType("lecture");
    setModalOpen(true);
  };

  const openEditModal = (r: any) => {
    setEditingRoom(r);
    setRoomNumber(r.roomNumber);
    setBuilding(r.building);
    setFloor(r.floor);
    setCapacity(r.capacity);
    setRoomType(r.roomType);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("intent", editingRoom ? "update" : "create");
    if (editingRoom) formData.append("id", editingRoom.id.toString());
    formData.append("roomNumber", roomNumber);
    formData.append("building", building);
    formData.append("floor", floor.toString());
    formData.append("capacity", capacity.toString());
    formData.append("roomType", roomType);

    submit(formData, { method: "post" });
    setModalOpen(false);
  };

  const handleDelete = (id: number, rNum: string) => {
    if (!confirm(`Are you sure you want to delete classroom ${rNum}?`)) return;
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
            <DoorOpen className="h-6 w-6 text-blue-600" />
            Classrooms & Laboratories
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Physical teaching spaces, seating capacities, and room type specifications.
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2 shadow-md shadow-blue-500/20">
          <Plus className="h-4 w-4" />
          Add Classroom
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Room Number</th>
                  <th className="p-4">Facility Type</th>
                  <th className="p-4">Seating Capacity</th>
                  <th className="p-4">Building & Floor</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {classroomsList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500 dark:text-slate-400 text-sm">
                      No classrooms added yet. Click &quot;Add Classroom&quot; to configure your lecture halls and labs.
                    </td>
                  </tr>
                ) : (
                  classroomsList.map((rm) => (
                    <tr key={rm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white text-base">
                        {rm.roomNumber}
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          rm.roomType === "lab"
                            ? "success"
                            : rm.roomType === "seminar"
                            ? "secondary"
                            : "default"
                        }
                        className="uppercase text-[11px]"
                      >
                        {rm.roomType}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>{rm.capacity} Seats</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {rm.building}
                      </div>
                      <div className="text-xs text-slate-400">Floor {rm.floor}</div>
                    </td>
                    <td className="p-4">
                      <Badge variant={rm.isActive ? "success" : "secondary"}>
                        {rm.isActive ? "Active" : "Under Maintenance"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(rm)}
                          title="Edit Room"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rm.id, rm.roomNumber)}
                          title="Delete Room"
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

      {/* Classroom Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingRoom ? "Edit Classroom" : "Add New Classroom"}
        description="Configure classroom seating capacity and room category."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rm-number">Room Identifier</Label>
              <Input
                id="rm-number"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. LH-101 or LAB-1"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rm-type">Facility Room Type</Label>
              <select
                id="rm-type"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value as any)}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="lecture">Lecture Hall</option>
                <option value="lab">Computer / Practical Lab</option>
                <option value="seminar">Seminar / Conference Hall</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rm-cap">Seating Capacity</Label>
              <Input
                id="rm-cap"
                type="number"
                min="10"
                max="300"
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rm-bldg">Building</Label>
              <Input
                id="rm-bldg"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
                placeholder="CS Block"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rm-flr">Floor Level</Label>
              <Input
                id="rm-flr"
                type="number"
                min="0"
                max="10"
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editingRoom ? "Save Changes" : "Create Classroom"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
