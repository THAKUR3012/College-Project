import React, { useState } from "react";
import {
  Calendar,
  Clock,
  MapPin,
  User,
  GraduationCap,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Printer,
  Download,
} from "lucide-react";
import { formatTime, cn } from "~/utils/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Modal } from "~/components/ui/modal";
import { Input, Label } from "~/components/ui/input";

export interface TimetableEntryItem {
  id: number;
  classId: number;
  subjectId: number;
  facultyId: number;
  classroomId: number;
  dayId: number;
  periodId: number;
  isFixed: boolean;
  class: { id: number; name: string; section: string; studentCount: number };
  subject: {
    id: number;
    code: string;
    name: string;
    type: "theory" | "practical" | "seminar";
    colorCode: string;
    consecutiveSlotsRequired: number;
  };
  faculty: { id: number; fullName: string; designation: string; department: string };
  classroom: { id: number; roomNumber: string; capacity: number; roomType: string };
  day: { id: number; dayName: string; dayOrder: number };
  period: { id: number; periodNumber: number; name: string; startTime: string; endTime: string };
}

interface TimetableGridProps {
  entries: TimetableEntryItem[];
  days: Array<{ id: number; dayName: string; dayOrder: number }>;
  periods: Array<{ id: number; periodNumber: number; name: string; startTime: string; endTime: string }>;
  classes: Array<{ id: number; name: string; studentCount: number }>;
  facultyList: Array<{ id: number; fullName: string }>;
  rooms: Array<{ id: number; roomNumber: string; roomType: string; capacity: number }>;
  subjects: Array<{ id: number; code: string; name: string; type: string }>;
  isEditable?: boolean;
  versionId?: number;
  onManualEditSubmit?: (data: any) => Promise<{ success: boolean; error?: string }>;
  onDeleteEntry?: (entryId: number) => Promise<void>;
}

export function TimetableGrid({
  entries,
  days,
  periods,
  classes,
  facultyList,
  rooms,
  subjects,
  isEditable = false,
  versionId,
  onManualEditSubmit,
  onDeleteEntry,
}: TimetableGridProps) {
  // View mode: 'class' | 'faculty' | 'room'
  const [viewMode, setViewMode] = useState<"class" | "faculty" | "room">("class");
  const [selectedClassId, setSelectedClassId] = useState<number>(classes[0]?.id || 1);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number>(facultyList[0]?.id || 1);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(rooms[0]?.id || 1);

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntryItem | null>(null);
  const [targetSlot, setTargetSlot] = useState<{ dayId: number; periodId: number } | null>(null);

  // Form State
  const [formClassId, setFormClassId] = useState<number>(classes[0]?.id || 1);
  const [formSubjectId, setFormSubjectId] = useState<number>(subjects[0]?.id || 1);
  const [formFacultyId, setFormFacultyId] = useState<number>(facultyList[0]?.id || 1);
  const [formRoomId, setFormRoomId] = useState<number>(rooms[0]?.id || 1);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter entries according to active view mode
  const filteredEntries = entries.filter((e) => {
    if (viewMode === "class") return e.classId === selectedClassId;
    if (viewMode === "faculty") return e.facultyId === selectedFacultyId;
    if (viewMode === "room") return e.classroomId === selectedRoomId;
    return true;
  });

  // Fast matrix lookup: `${dayId}:${periodId}` -> TimetableEntryItem
  const slotMap = new Map<string, TimetableEntryItem>();
  for (const entry of filteredEntries) {
    slotMap.set(`${entry.dayId}:${entry.periodId}`, entry);
  }

  const handleOpenAddOrEdit = (dayId: number, periodId: number, existing?: TimetableEntryItem) => {
    if (!isEditable) return;
    setFormError(null);
    setTargetSlot({ dayId, periodId });

    if (existing) {
      setEditingEntry(existing);
      setFormClassId(existing.classId);
      setFormSubjectId(existing.subjectId);
      setFormFacultyId(existing.facultyId);
      setFormRoomId(existing.classroomId);
    } else {
      setEditingEntry(null);
      setFormClassId(viewMode === "class" ? selectedClassId : classes[0]?.id || 1);
      setFormFacultyId(viewMode === "faculty" ? selectedFacultyId : facultyList[0]?.id || 1);
      setFormRoomId(viewMode === "room" ? selectedRoomId : rooms[0]?.id || 1);
      setFormSubjectId(subjects[0]?.id || 1);
    }

    setModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSlot || !onManualEditSubmit || !versionId) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await onManualEditSubmit({
        versionId,
        entryId: editingEntry?.id,
        classId: formClassId,
        subjectId: formSubjectId,
        facultyId: formFacultyId,
        classroomId: formRoomId,
        dayId: targetSlot.dayId,
        periodId: targetSlot.periodId,
      });

      if (!res.success) {
        setFormError(res.error || "Failed to update timetable slot.");
      } else {
        setModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err.message || "Conflict occurred while updating timetable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (entryId: number) => {
    if (!confirm("Are you sure you want to remove this timetable session?")) return;
    if (onDeleteEntry) {
      await onDeleteEntry(entryId);
    }
  };

  // Export CSV
  const exportToCSV = () => {
    const headers = ["Day", "Period", "Time", "Subject Code", "Subject Name", "Class", "Faculty", "Classroom"];
    const rows = filteredEntries.map((e) => [
      e.day.dayName,
      e.period.name,
      `${formatTime(e.period.startTime)} - ${formatTime(e.period.endTime)}`,
      e.subject.code,
      `"${e.subject.name}"`,
      e.class.name,
      `"${e.faculty.fullName}"`,
      e.classroom.roomNumber,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `timetable-${viewMode}-export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* View Switcher and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            View Schedule By:
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setViewMode("class")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === "class"
                  ? "bg-white text-blue-600 shadow-xs font-semibold dark:bg-slate-800 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              Class-wise
            </button>
            <button
              type="button"
              onClick={() => setViewMode("faculty")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === "faculty"
                  ? "bg-white text-blue-600 shadow-xs font-semibold dark:bg-slate-800 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              Faculty-wise
            </button>
            <button
              type="button"
              onClick={() => setViewMode("room")}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                viewMode === "room"
                  ? "bg-white text-blue-600 shadow-xs font-semibold dark:bg-slate-800 dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              Room-wise
            </button>
          </div>
        </div>

        {/* Entity Selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {viewMode === "class" && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              aria-label="Select Class"
              className="w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-xs"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} students)
                </option>
              ))}
            </select>
          )}

          {viewMode === "faculty" && (
            <select
              value={selectedFacultyId}
              onChange={(e) => setSelectedFacultyId(Number(e.target.value))}
              aria-label="Select Faculty Member"
              className="w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-xs"
            >
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName}
                </option>
              ))}
            </select>
          )}

          {viewMode === "room" && (
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(Number(e.target.value))}
              aria-label="Select Classroom"
              className="w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-xs"
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.roomType.toUpperCase()}, Cap: {r.capacity})
                </option>
              ))}
            </select>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              title="Print Schedule"
              className="h-9 px-2.5 text-slate-600 dark:text-slate-300"
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              title="Export as CSV"
              className="h-9 px-2.5 text-slate-600 dark:text-slate-300"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Timetable Matrix Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm print:border-none print:shadow-none">
        <table className="w-full border-collapse text-left min-w-[850px]">
          {/* Table Header: Days of the Week */}
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
              <th className="w-36 p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center border-r border-slate-200 dark:border-slate-800">
                Period / Time
              </th>
              {days.map((day) => (
                <th
                  key={day.id}
                  className="p-3 text-center text-sm font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                >
                  <span className="block text-slate-900 dark:text-white">{day.dayName}</span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body: Periods as Rows */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {periods.map((period) => (
              <tr key={period.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors">
                {/* Period Time Column */}
                <td className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    {period.name}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                    {formatTime(period.startTime)} - {formatTime(period.endTime)}
                  </span>
                </td>

                {/* Day Slots */}
                {days.map((day) => {
                  const entry = slotMap.get(`${day.id}:${period.id}`);

                  return (
                    <td
                      key={day.id}
                      onClick={() => handleOpenAddOrEdit(day.id, period.id, entry)}
                      className={cn(
                        "p-2.5 align-top border-r border-slate-200 dark:border-slate-800 last:border-r-0 min-h-[96px] transition-all",
                        isEditable ? "cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20" : ""
                      )}
                    >
                      {entry ? (
                        <div
                          className="relative rounded-lg p-2.5 shadow-xs border transition-all text-xs space-y-1.5 group"
                          style={{
                            borderLeftColor: entry.subject.colorCode || "#3b82f6",
                            borderLeftWidth: "4px",
                            backgroundColor: `${entry.subject.colorCode || "#3b82f6"}12`,
                          }}
                        >
                          {/* Subject Code & Type */}
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {entry.subject.code}
                            </span>
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase",
                                entry.subject.type === "practical"
                                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                                  : entry.subject.type === "seminar"
                                  ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                                  : "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              )}
                            >
                              {entry.subject.type}
                            </span>
                          </div>

                          {/* Subject Name */}
                          <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                            {entry.subject.name}
                          </p>

                          {/* Context details depending on view mode */}
                          <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 space-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {viewMode !== "faculty" && (
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{entry.faculty.fullName}</span>
                              </div>
                            )}

                            {viewMode !== "class" && (
                              <div className="flex items-center gap-1.5">
                                <GraduationCap className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{entry.class.name}</span>
                              </div>
                            )}

                            {viewMode !== "room" && (
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {entry.classroom.roomNumber}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Action Hover Controls */}
                          {isEditable && (
                            <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 rounded p-0.5 shadow-sm">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenAddOrEdit(day.id, period.id, entry);
                                }}
                                title="Edit Slot"
                                className="p-1 text-slate-500 hover:text-blue-600"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(entry.id);
                                }}
                                title="Delete Slot"
                                className="p-1 text-slate-500 hover:text-rose-600"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-20 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 transition-colors">
                          {isEditable ? (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-blue-600">
                              <Plus className="h-3.5 w-3.5" />
                              Assign
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Free</span>
                          )}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual Slot Edit / Assignment Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEntry ? "Edit Timetable Assignment" : "Assign Session Slot"}
        description={
          targetSlot
            ? `Target: ${days.find((d) => d.id === targetSlot.dayId)?.dayName}, ${
                periods.find((p) => p.id === targetSlot.periodId)?.name
              }`
            : ""
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Hard Constraint Violation</strong>
                <span>{formError}</span>
              </div>
            </div>
          )}

          {/* Class Select */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-class">Class Section</Label>
            <select
              id="modal-class"
              value={formClassId}
              onChange={(e) => setFormClassId(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              required
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} students)
                </option>
              ))}
            </select>
          </div>

          {/* Subject Select */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-subject">Subject</Label>
            <select
              id="modal-subject"
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              required
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name} ({s.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Faculty Select */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-faculty">Faculty Member</Label>
            <select
              id="modal-faculty"
              value={formFacultyId}
              onChange={(e) => setFormFacultyId(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              required
            >
              {facultyList.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Classroom Select */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-room">Classroom / Lab</Label>
            <select
              id="modal-room"
              value={formRoomId}
              onChange={(e) => setFormRoomId(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              required
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.roomType.toUpperCase()}, Capacity: {r.capacity})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Validating & Saving..." : editingEntry ? "Update Slot" : "Assign Slot"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
