import React, { useState, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarPlus,
  Filter,
  Layers,
} from "lucide-react";
import {
  formatTime,
  cn,
  getTodayDateString,
  adjustDateString,
  getDayInfoFromDate,
  getWeekDatesMap,
  getNextWorkingDate,
} from "~/utils/utils";
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
  initialView?: "class" | "faculty" | "room" | "date";
  initialDate?: string;
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
  initialView,
  initialDate,
  onManualEditSubmit,
  onDeleteEntry,
}: TimetableGridProps) {
  // View mode: 'class' | 'faculty' | 'room' | 'date'
  const [viewMode, setViewMode] = useState<"class" | "faculty" | "room" | "date">(
    initialView || "class"
  );
  const [selectedClassId, setSelectedClassId] = useState<number>(classes[0]?.id || 1);
  const [selectedFacultyId, setSelectedFacultyId] = useState<number>(facultyList[0]?.id || 1);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(rooms[0]?.id || 1);

  // Date-wise View State
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayDateString());
  const [dateGrouping, setDateGrouping] = useState<"class" | "faculty" | "room">("class");
  const [dateEntityFilter, setDateEntityFilter] = useState<number | "all">("all");

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntryItem | null>(null);
  const [modalDate, setModalDate] = useState<string>(getTodayDateString());

  // Form State
  const [formClassId, setFormClassId] = useState<number>(classes[0]?.id || 1);
  const [formSubjectId, setFormSubjectId] = useState<number>(subjects[0]?.id || 1);
  const [formFacultyId, setFormFacultyId] = useState<number>(facultyList[0]?.id || 1);
  const [formRoomId, setFormRoomId] = useState<number>(rooms[0]?.id || 1);
  const [formDayId, setFormDayId] = useState<number>(days[0]?.id || 1);
  const [formPeriodId, setFormPeriodId] = useState<number>(periods[0]?.id || 1);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derived date info
  const dayInfo = useMemo(() => getDayInfoFromDate(selectedDate, days), [selectedDate, days]);
  const modalDayInfo = useMemo(() => getDayInfoFromDate(modalDate, days), [modalDate, days]);
  const weekDatesMap = useMemo(() => getWeekDatesMap(selectedDate, days), [selectedDate, days]);

  // Filter entries according to active view mode for weekly view
  const weeklyFilteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (viewMode === "class") return e.classId === selectedClassId;
      if (viewMode === "faculty") return e.facultyId === selectedFacultyId;
      if (viewMode === "room") return e.classroomId === selectedRoomId;
      return true;
    });
  }, [entries, viewMode, selectedClassId, selectedFacultyId, selectedRoomId]);

  // Fast matrix lookup for weekly view: `${dayId}:${periodId}` -> TimetableEntryItem
  const weeklySlotMap = useMemo(() => {
    const map = new Map<string, TimetableEntryItem>();
    for (const entry of weeklyFilteredEntries) {
      map.set(`${entry.dayId}:${entry.periodId}`, entry);
    }
    return map;
  }, [weeklyFilteredEntries]);

  // Entries for the selected Date (matched by dayId of that date)
  const dateEntries = useMemo(() => {
    if (!dayInfo.workingDay) return [];
    return entries.filter((e) => e.dayId === dayInfo.workingDay!.id);
  }, [entries, dayInfo]);

  // Fast matrix lookup for Date-wise view:
  // key: `${entityId}:${periodId}`
  const dateSlotMap = useMemo(() => {
    const map = new Map<string, TimetableEntryItem>();
    for (const entry of dateEntries) {
      if (dateGrouping === "class") {
        map.set(`${entry.classId}:${entry.periodId}`, entry);
      } else if (dateGrouping === "faculty") {
        map.set(`${entry.facultyId}:${entry.periodId}`, entry);
      } else if (dateGrouping === "room") {
        map.set(`${entry.classroomId}:${entry.periodId}`, entry);
      }
    }
    return map;
  }, [dateEntries, dateGrouping]);

  // Open Add or Edit modal
  const handleOpenAddOrEdit = (
    dayId: number,
    periodId: number,
    existing?: TimetableEntryItem,
    slotDate?: string,
    presetClassId?: number,
    presetFacultyId?: number,
    presetRoomId?: number
  ) => {
    if (!isEditable) return;
    setFormError(null);
    setFormDayId(dayId);
    setFormPeriodId(periodId);

    // Calculate slot date
    const defaultDate = slotDate || weekDatesMap.get(dayId)?.dateStr || selectedDate;
    setModalDate(defaultDate);

    if (existing) {
      setEditingEntry(existing);
      setFormClassId(existing.classId);
      setFormSubjectId(existing.subjectId);
      setFormFacultyId(existing.facultyId);
      setFormRoomId(existing.classroomId);
    } else {
      setEditingEntry(null);
      setFormClassId(presetClassId ?? (viewMode === "class" ? selectedClassId : classes[0]?.id || 1));
      setFormFacultyId(presetFacultyId ?? (viewMode === "faculty" ? selectedFacultyId : facultyList[0]?.id || 1));
      setFormRoomId(presetRoomId ?? (viewMode === "room" ? selectedRoomId : rooms[0]?.id || 1));
      setFormSubjectId(subjects[0]?.id || 1);
    }

    setModalOpen(true);
  };

  // Open "Set Timetable by Date" directly
  const handleOpenAddByDate = (dateStr: string) => {
    if (!isEditable) return;
    const info = getDayInfoFromDate(dateStr, days);
    const dayToUse = info.workingDay?.id || days[0]?.id || 1;
    handleOpenAddOrEdit(dayToUse, periods[0]?.id || 1, undefined, dateStr);
  };

  // When user changes date in modal
  const handleModalDateChange = (newDate: string) => {
    setModalDate(newDate);
    const info = getDayInfoFromDate(newDate, days);
    if (info.workingDay) {
      setFormDayId(info.workingDay.id);
    }
  };

  // When user changes day dropdown in modal
  const handleDaySelectChange = (newDayId: number) => {
    setFormDayId(newDayId);
    const mapped = weekDatesMap.get(newDayId);
    if (mapped) {
      setModalDate(mapped.dateStr);
    }
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onManualEditSubmit || !versionId) return;

    if (!modalDayInfo.isWorkingDay) {
      setFormError(
        `Selected date (${modalDayInfo.formattedDate}) is a ${modalDayInfo.dayName} (non-working day). Please pick a Monday–Friday date to match college schedule.`
      );
      return;
    }

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
        dayId: formDayId,
        periodId: formPeriodId,
        date: modalDate,
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
    if (viewMode === "date") {
      const headers = [
        "Date",
        "Day",
        "Period",
        "Time",
        "Class",
        "Subject Code",
        "Subject Name",
        "Faculty",
        "Classroom",
      ];
      const rows = dateEntries.map((e) => [
        `"${selectedDate}"`,
        `"${dayInfo.dayName}"`,
        `"${e.period.name}"`,
        `"${formatTime(e.period.startTime)} - ${formatTime(e.period.endTime)}"`,
        `"${e.class.name}"`,
        `"${e.subject.code}"`,
        `"${e.subject.name}"`,
        `"${e.faculty.fullName}"`,
        `"${e.classroom.roomNumber}"`,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `timetable-date-${selectedDate}-export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const headers = ["Day", "Date", "Period", "Time", "Subject Code", "Subject Name", "Class", "Faculty", "Classroom"];
    const rows = weeklyFilteredEntries.map((e) => {
      const weekDate = weekDatesMap.get(e.dayId)?.dateStr || "";
      return [
        e.day.dayName,
        weekDate,
        e.period.name,
        `${formatTime(e.period.startTime)} - ${formatTime(e.period.endTime)}`,
        e.subject.code,
        `"${e.subject.name}"`,
        e.class.name,
        `"${e.faculty.fullName}"`,
        e.classroom.roomNumber,
      ];
    });

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

  // Filtered rows for Date-wise view
  const displayedDateEntities = useMemo(() => {
    if (dateGrouping === "class") {
      if (dateEntityFilter === "all") return classes;
      return classes.filter((c) => c.id === dateEntityFilter);
    }
    if (dateGrouping === "faculty") {
      if (dateEntityFilter === "all") return facultyList;
      return facultyList.filter((f) => f.id === dateEntityFilter);
    }
    if (dateGrouping === "room") {
      if (dateEntityFilter === "all") return rooms;
      return rooms.filter((r) => r.id === dateEntityFilter);
    }
    return [];
  }, [dateGrouping, dateEntityFilter, classes, facultyList, rooms]);

  return (
    <div className="space-y-6">
      {/* Top Filter & View Selection Toolbar */}
      <div className="flex flex-col gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              View Schedule By:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setViewMode("class")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
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
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
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
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                  viewMode === "room"
                    ? "bg-white text-blue-600 shadow-xs font-semibold dark:bg-slate-800 dark:text-blue-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                )}
              >
                Room-wise
              </button>
              <button
                type="button"
                onClick={() => setViewMode("date")}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5",
                  viewMode === "date"
                    ? "bg-blue-600 text-white shadow-xs font-semibold dark:bg-blue-600 dark:text-white"
                    : "text-blue-600 hover:text-blue-700 dark:text-blue-400"
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                Date-wise
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
            {isEditable && (
              <Button
                size="sm"
                onClick={() => handleOpenAddByDate(selectedDate)}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs"
              >
                <CalendarPlus className="h-4 w-4" />
                Set Timetable by Date
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              title="Print Schedule"
              className="h-9 px-2.5 text-slate-600 dark:text-slate-300"
            >
              <Printer className="h-4 w-4 mr-1 sm:mr-0" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              title="Export as CSV"
              className="h-9 px-2.5 text-slate-600 dark:text-slate-300"
            >
              <Download className="h-4 w-4 mr-1 sm:mr-0" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Secondary Context & Controls Bar */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          {/* DATE-WISE CONTROLS */}
          {viewMode === "date" ? (
            <div className="flex flex-wrap items-center gap-3 w-full justify-between">
              {/* Date Navigation & Picker */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Select Date:
                </span>
                <div className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(adjustDateString(selectedDate, -1))}
                    title="Previous Day"
                    className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-l-lg"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2 py-1 text-xs font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-0 focus:outline-hidden focus:ring-0 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(adjustDateString(selectedDate, 1))}
                    title="Next Day"
                    className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-r-lg"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(getTodayDateString())}
                  className="h-8 text-xs font-medium"
                >
                  Today
                </Button>

                {/* Day status badge */}
                {dayInfo.isWorkingDay ? (
                  <Badge variant="success" className="gap-1 py-1 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {dayInfo.formattedDate} ({dayInfo.dayName})
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800"
                  >
                    <AlertCircle className="h-3.5 w-3.5" />
                    {dayInfo.formattedDate} ({dayInfo.dayName} - Off-Day)
                  </Badge>
                )}
              </div>

              {/* Date View Grouping & Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Group By:
                </span>
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-950 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setDateGrouping("class");
                      setDateEntityFilter("all");
                    }}
                    className={cn(
                      "px-2.5 py-1 font-medium rounded-md transition-colors",
                      dateGrouping === "class"
                        ? "bg-white text-blue-600 shadow-xs font-semibold dark:bg-slate-800 dark:text-blue-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    )}
                  >
                    Classes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateGrouping("faculty");
                      setDateEntityFilter("all");
                    }}
                    className={cn(
                      "px-2.5 py-1 font-medium rounded-md transition-colors",
                      dateGrouping === "faculty"
                        ? "bg-white text-blue-600 shadow-xs font-semibold dark:bg-slate-800 dark:text-blue-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    )}
                  >
                    Faculty
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDateGrouping("room");
                      setDateEntityFilter("all");
                    }}
                    className={cn(
                      "px-2.5 py-1 font-medium rounded-md transition-colors",
                      dateGrouping === "room"
                        ? "bg-white text-blue-600 shadow-xs font-semibold dark:bg-slate-800 dark:text-blue-400"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
                    )}
                  >
                    Rooms
                  </button>
                </div>

                {/* Sub-Filter Dropdown */}
                <select
                  value={dateEntityFilter}
                  onChange={(e) =>
                    setDateEntityFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                  }
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-xs"
                >
                  <option value="all">
                    All {dateGrouping === "class" ? "Classes" : dateGrouping === "faculty" ? "Faculty" : "Rooms"}
                  </option>
                  {dateGrouping === "class" &&
                    classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  {dateGrouping === "faculty" &&
                    facultyList.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fullName}
                      </option>
                    ))}
                  {dateGrouping === "room" &&
                    rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} ({r.roomType.toUpperCase()})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ) : (
            /* WEEKLY VIEW CONTROLS (Class / Faculty / Room) */
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              {/* Entity Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {viewMode === "class" ? "Select Class:" : viewMode === "faculty" ? "Select Faculty:" : "Select Room:"}
                </span>

                {viewMode === "class" && (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(Number(e.target.value))}
                    aria-label="Select Class"
                    className="w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-xs"
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
                    className="w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-xs"
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
                    className="w-full sm:w-64 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 shadow-xs"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} ({r.roomType.toUpperCase()}, Cap: {r.capacity})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Reference Week Date Picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Week Date:
                </span>
                <div className="inline-flex items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(adjustDateString(selectedDate, -7))}
                    title="Previous Week"
                    className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-l-lg"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-2 py-1 text-xs font-medium text-slate-900 dark:text-slate-100 bg-transparent border-0 focus:outline-hidden focus:ring-0 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedDate(adjustDateString(selectedDate, 7))}
                    title="Next Week"
                    className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-r-lg"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedDate(getTodayDateString())}
                  className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
                >
                  Current Week
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DATE-WISE SCHEDULE VIEW */}
      {viewMode === "date" ? (
        <div className="space-y-4">
          {!dayInfo.isWorkingDay ? (
            <div className="rounded-xl border border-dashed border-amber-300 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {dayInfo.formattedDate} is a College Non-Working Day ({dayInfo.dayName})
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Regular college lectures and timetable sessions operate Monday through Friday. You can jump to the next working day or pick any academic working date.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setSelectedDate(getNextWorkingDate(selectedDate, days))}
                  className="gap-1.5 bg-blue-600 text-white font-medium"
                >
                  <Calendar className="h-4 w-4" />
                  Jump to Next Working Day
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm print:border-none print:shadow-none">
              <table className="w-full border-collapse text-left min-w-[900px]">
                {/* Table Header: Periods */}
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
                    <th className="w-48 p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left border-r border-slate-200 dark:border-slate-800">
                      {dateGrouping === "class"
                        ? "Class Section"
                        : dateGrouping === "faculty"
                        ? "Faculty Member"
                        : "Classroom / Lab"}
                    </th>
                    {periods.map((period) => (
                      <th
                        key={period.id}
                        className="p-3 text-center text-xs font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                      >
                        <span className="block text-slate-900 dark:text-white font-bold">{period.name}</span>
                        <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                          {formatTime(period.startTime)} - {formatTime(period.endTime)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body: Entity Rows */}
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {displayedDateEntities.map((entity: any) => (
                    <tr
                      key={entity.id}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Entity Label Column */}
                      <td className="p-3 bg-slate-50/40 dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-800 align-middle">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                          {dateGrouping === "class"
                            ? entity.name
                            : dateGrouping === "faculty"
                            ? entity.fullName
                            : entity.roomNumber}
                        </span>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {dateGrouping === "class"
                            ? `${entity.studentCount} students`
                            : dateGrouping === "faculty"
                            ? entity.department || "Faculty"
                            : `${entity.roomType?.toUpperCase()} (Cap: ${entity.capacity})`}
                        </span>
                      </td>

                      {/* Period Cells */}
                      {periods.map((period) => {
                        const entry = dateSlotMap.get(`${entity.id}:${period.id}`);

                        return (
                          <td
                            key={period.id}
                            onClick={() => {
                              if (dayInfo.workingDay) {
                                handleOpenAddOrEdit(
                                  dayInfo.workingDay.id,
                                  period.id,
                                  entry,
                                  selectedDate,
                                  dateGrouping === "class" ? entity.id : undefined,
                                  dateGrouping === "faculty" ? entity.id : undefined,
                                  dateGrouping === "room" ? entity.id : undefined
                                );
                              }
                            }}
                            className={cn(
                              "p-2 align-top border-r border-slate-200 dark:border-slate-800 last:border-r-0 min-h-[96px] min-w-[140px] transition-all",
                              isEditable ? "cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-950/20" : ""
                            )}
                          >
                            {entry ? (
                              <div
                                className="relative rounded-lg p-2 shadow-xs border transition-all text-xs space-y-1 group"
                                style={{
                                  borderLeftColor: entry.subject.colorCode || "#3b82f6",
                                  borderLeftWidth: "4px",
                                  backgroundColor: `${entry.subject.colorCode || "#3b82f6"}12`,
                                }}
                              >
                                {/* Subject Code & Type */}
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                                    {entry.subject.code}
                                  </span>
                                  <span
                                    className={cn(
                                      "text-[9px] px-1 py-0.2 rounded font-semibold uppercase",
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
                                <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 line-clamp-1">
                                  {entry.subject.name}
                                </p>

                                {/* Context details */}
                                <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 space-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                  {dateGrouping !== "faculty" && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{entry.faculty.fullName}</span>
                                    </div>
                                  )}

                                  {dateGrouping !== "class" && (
                                    <div className="flex items-center gap-1">
                                      <GraduationCap className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{entry.class.name}</span>
                                    </div>
                                  )}

                                  {dateGrouping !== "room" && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="font-medium text-slate-700 dark:text-slate-300">
                                        {entry.classroom.roomNumber}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Action Hover Controls */}
                                {isEditable && (
                                  <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-white/95 dark:bg-slate-900/95 rounded p-0.5 shadow-sm">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (dayInfo.workingDay) {
                                          handleOpenAddOrEdit(
                                            dayInfo.workingDay.id,
                                            period.id,
                                            entry,
                                            selectedDate
                                          );
                                        }
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
                              <div className="h-16 flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 transition-colors">
                                {isEditable ? (
                                  <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-blue-600">
                                    <Plus className="h-3 w-3" />
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
          )}
        </div>
      ) : (
        /* WEEKLY MATRIX GRID (Class-wise, Faculty-wise, Room-wise) */
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm print:border-none print:shadow-none">
          <table className="w-full border-collapse text-left min-w-[850px]">
            {/* Table Header: Days of the Week with Exact Dates */}
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
                <th className="w-36 p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center border-r border-slate-200 dark:border-slate-800">
                  Period / Time
                </th>
                {days.map((day) => {
                  const weekDate = weekDatesMap.get(day.id);
                  return (
                    <th
                      key={day.id}
                      className="p-3 text-center text-sm font-bold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                    >
                      <span className="block text-slate-900 dark:text-white">{day.dayName}</span>
                      {weekDate && (
                        <span className="block text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-0.5">
                          {weekDate.formatted}
                        </span>
                      )}
                    </th>
                  );
                })}
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
                    const entry = weeklySlotMap.get(`${day.id}:${period.id}`);
                    const slotDate = weekDatesMap.get(day.id)?.dateStr;

                    return (
                      <td
                        key={day.id}
                        onClick={() => handleOpenAddOrEdit(day.id, period.id, entry, slotDate)}
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
                                    handleOpenAddOrEdit(day.id, period.id, entry, slotDate);
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
      )}

      {/* Manual Slot Edit / Assignment Modal (Supports Date-wise Setting) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEntry ? "Edit Timetable Assignment" : "Assign Session Slot"}
        description={`Schedule target: ${modalDayInfo.formattedDate} (${modalDayInfo.dayName})`}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Constraint Notice</strong>
                <span>{formError}</span>
              </div>
            </div>
          )}

          {/* Date Picker Input */}
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label htmlFor="modal-date" className="text-xs font-semibold">
                Session Date
              </Label>
              <span
                className={cn(
                  "text-[11px] font-semibold",
                  modalDayInfo.isWorkingDay
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {modalDayInfo.dayName} {modalDayInfo.isWorkingDay ? "✓ (Working Day)" : "⚠️ (Non-working Day)"}
              </span>
            </div>
            <Input
              id="modal-date"
              type="date"
              value={modalDate}
              onChange={(e) => handleModalDateChange(e.target.value)}
              required
              className="text-sm font-medium"
            />
            {!modalDayInfo.isWorkingDay && (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                ⚠️ The selected date falls on a {modalDayInfo.dayName} (non-working day). Regular college timetable slots can only be scheduled on working days (Monday – Friday).
              </p>
            )}
          </div>

          {/* Day & Period Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="modal-day">Day of Week</Label>
              <select
                id="modal-day"
                value={formDayId}
                onChange={(e) => handleDaySelectChange(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                required
              >
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modal-period">Period / Time Slot</Label>
              <select
                id="modal-period"
                value={formPeriodId}
                onChange={(e) => setFormPeriodId(Number(e.target.value))}
                className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                required
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatTime(p.startTime)} - {formatTime(p.endTime)})
                  </option>
                ))}
              </select>
            </div>
          </div>

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
            <Button type="submit" disabled={isSubmitting || !modalDayInfo.isWorkingDay}>
              {isSubmitting ? "Validating & Saving..." : editingEntry ? "Update Slot" : "Assign Slot"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}