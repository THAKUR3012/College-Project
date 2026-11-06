import { useState } from "react";
import {
  useLoaderData,
  useSubmit,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { Clock, ShieldAlert, CheckCircle2, Star, User, DoorOpen, Save } from "lucide-react";
import { requireUser } from "~/services/auth.server";
import { db } from "~/db/index.server";
import {
  faculty,
  classrooms,
  workingDays,
  periods,
  facultyAvailability,
  roomAvailability,
} from "~/db/schema/index";
import { eq, and } from "drizzle-orm";
import { setFacultyAvailability } from "~/services/faculty.server";
import { setRoomAvailability } from "~/services/classroom.server";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { formatTime, cn } from "~/utils/utils";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  const allFaculty = await db.query.faculty.findMany({
    where: eq(faculty.isActive, true),
    orderBy: (f, { asc }) => [asc(f.fullName)],
  });

  const allRooms = await db.query.classrooms.findMany({
    where: eq(classrooms.isActive, true),
    orderBy: (r, { asc }) => [asc(r.roomNumber)],
  });

  const daysList = await db.query.workingDays.findMany({
    where: eq(workingDays.isActive, true),
    orderBy: (d, { asc }) => [asc(d.dayOrder)],
  });

  const periodsList = await db.query.periods.findMany({
    where: eq(periods.isBreak, false),
    orderBy: (p, { asc }) => [asc(p.periodNumber)],
  });

  const facAvail = await db.query.facultyAvailability.findMany();
  const roomAvail = await db.query.roomAvailability.findMany();

  return {
    user,
    allFaculty,
    allRooms,
    daysList,
    periodsList,
    facAvail,
    roomAvail,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "toggle_faculty_slot") {
    const facultyId = Number(formData.get("facultyId"));
    const dayId = Number(formData.get("dayId"));
    const periodId = Number(formData.get("periodId"));
    const nextStatus = formData.get("nextStatus")?.toString() as "available" | "unavailable" | "preferred";
    const reason = formData.get("reason")?.toString() || "";

    // If role is faculty, ensure they only edit their own
    if (user.role.name === "faculty" && user.faculty?.id !== facultyId) {
      return { success: false, error: "Unauthorized" };
    }

    try {
      await setFacultyAvailability(facultyId, dayId, periodId, nextStatus, reason);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  if (intent === "toggle_room_slot") {
    const classroomId = Number(formData.get("classroomId"));
    const dayId = Number(formData.get("dayId"));
    const periodId = Number(formData.get("periodId"));
    const isAvailable = formData.get("isAvailable") === "true";

    try {
      await setRoomAvailability(classroomId, dayId, periodId, isAvailable);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  return { success: false };
}

export default function AvailabilityPage() {
  const { user, allFaculty, allRooms, daysList, periodsList, facAvail, roomAvail } =
    useLoaderData<typeof loader>();
  const submit = useSubmit();

  const isFacultyUser = user.role.name === "faculty";
  const defaultFacId = isFacultyUser && user.faculty ? user.faculty.id : allFaculty[0]?.id || 1;

  const [activeTab, setActiveTab] = useState<"faculty" | "room">("faculty");
  const [selectedFacultyId, setSelectedFacultyId] = useState<number>(defaultFacId);
  const [selectedRoomId, setSelectedRoomId] = useState<number>(allRooms[0]?.id || 1);

  // Map of faculty availability: `${facultyId}:${dayId}:${periodId}` -> status
  const facMap = new Map<string, { status: string; reason?: string | null }>();
  for (const fa of facAvail) {
    facMap.set(`${fa.facultyId}:${fa.dayId}:${fa.periodId}`, {
      status: fa.status,
      reason: fa.reason,
    });
  }

  // Map of room availability: `${roomId}:${dayId}:${periodId}` -> boolean
  const roomMap = new Map<string, boolean>();
  for (const ra of roomAvail) {
    roomMap.set(`${ra.classroomId}:${ra.dayId}:${ra.periodId}`, ra.isAvailable);
  }

  const handleFacultySlotClick = (dayId: number, periodId: number) => {
    const key = `${selectedFacultyId}:${dayId}:${periodId}`;
    const cur = facMap.get(key)?.status || "available";

    // Cycle: available -> preferred -> unavailable -> available
    let next: "available" | "preferred" | "unavailable" = "preferred";
    let defaultReason = "";
    if (cur === "preferred") {
      next = "unavailable";
      defaultReason = "Academic Duty / Leave";
    } else if (cur === "unavailable") {
      next = "available";
    } else {
      next = "preferred";
      defaultReason = "Preferred Window";
    }

    const formData = new FormData();
    formData.append("intent", "toggle_faculty_slot");
    formData.append("facultyId", selectedFacultyId.toString());
    formData.append("dayId", dayId.toString());
    formData.append("periodId", periodId.toString());
    formData.append("nextStatus", next);
    formData.append("reason", defaultReason);

    submit(formData, { method: "post" });
  };

  const handleRoomSlotClick = (dayId: number, periodId: number) => {
    const key = `${selectedRoomId}:${dayId}:${periodId}`;
    const cur = roomMap.get(key) ?? true;
    const next = !cur;

    const formData = new FormData();
    formData.append("intent", "toggle_room_slot");
    formData.append("classroomId", selectedRoomId.toString());
    formData.append("dayId", dayId.toString());
    formData.append("periodId", periodId.toString());
    formData.append("isAvailable", next.toString());

    submit(formData, { method: "post" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-6 w-6 text-blue-600" />
            Availability & Scheduling Rules
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure faculty time preferences, blocked leave windows, and classroom maintenance reservations.
          </p>
        </div>

        {/* Tab switch between Faculty & Room */}
        {!isFacultyUser && (
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-1 bg-white dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setActiveTab("faculty")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                activeTab === "faculty"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              Faculty Availability
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("room")}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                activeTab === "room"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              )}
            >
              Room Availability
            </button>
          </div>
        )}
      </div>

      {/* Target Selector & Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {activeTab === "faculty" ? (
          <div className="flex items-center gap-3">
            <label htmlFor="facSelector" className="text-xs font-semibold text-slate-500">Instructor:</label>
            {isFacultyUser ? (
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {user.fullName}
              </span>
            ) : (
              <select
                id="facSelector"
                value={selectedFacultyId}
                onChange={(e) => setSelectedFacultyId(Number(e.target.value))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-xs"
              >
                {allFaculty.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fullName} ({f.department})
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <label htmlFor="rmSelector" className="text-xs font-semibold text-slate-500">Classroom / Lab:</label>
            <select
              id="rmSelector"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(Number(e.target.value))}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-900 dark:text-slate-100 shadow-xs"
            >
              {allRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNumber} ({r.roomType.toUpperCase()}, {r.capacity} seats)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          {activeTab === "faculty" ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Preferred (Bonus)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                <span>Unavailable (Hard Block)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span>Available for Scheduling</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-rose-500" />
                <span>Maintenance / Reserved</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Interactive Matrix Grid */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <table className="w-full border-collapse text-left min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60">
              <th className="w-32 p-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center border-r border-slate-200 dark:border-slate-800">
                Period / Time
              </th>
              {daysList.map((d) => (
                <th
                  key={d.id}
                  className="p-3 text-center text-sm font-bold text-slate-900 dark:text-white border-r border-slate-200 dark:border-slate-800 last:border-r-0"
                >
                  {d.dayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {periodsList.map((p) => (
              <tr key={p.id}>
                <td className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    {p.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatTime(p.startTime)} - {formatTime(p.endTime)}
                  </span>
                </td>

                {daysList.map((d) => {
                  if (activeTab === "faculty") {
                    const key = `${selectedFacultyId}:${d.id}:${p.id}`;
                    const slot = facMap.get(key);
                    const status = slot?.status || "available";

                    return (
                      <td
                        key={d.id}
                        onClick={() => handleFacultySlotClick(d.id, p.id)}
                        className={cn(
                          "p-3 text-center cursor-pointer border-r border-slate-200 dark:border-slate-800 last:border-r-0 transition-colors select-none",
                          status === "unavailable"
                            ? "bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/80"
                            : status === "preferred"
                            ? "bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100/80"
                            : "bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/70"
                        )}
                      >
                        <div className="space-y-1">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-0.5 text-[11px] font-bold capitalize",
                              status === "unavailable"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200"
                                : status === "preferred"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                            )}
                          >
                            {status}
                          </span>
                          {slot?.reason && (
                            <p className="text-[10px] text-slate-500 truncate max-w-[120px] mx-auto">
                              {slot.reason}
                            </p>
                          )}
                        </div>
                      </td>
                    );
                  } else {
                    const key = `${selectedRoomId}:${d.id}:${p.id}`;
                    const isAvailable = roomMap.get(key) ?? true;

                    return (
                      <td
                        key={d.id}
                        onClick={() => handleRoomSlotClick(d.id, p.id)}
                        className={cn(
                          "p-3 text-center cursor-pointer border-r border-slate-200 dark:border-slate-800 last:border-r-0 transition-colors select-none",
                          isAvailable
                            ? "bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/70"
                            : "bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100/80"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block rounded-full px-2 py-0.5 text-[11px] font-bold",
                            isAvailable
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200"
                          )}
                        >
                          {isAvailable ? "Available" : "Maintenance Block"}
                        </span>
                      </td>
                    );
                  }
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400 text-center">
        💡 Tip: Click on any period slot above to cycle its availability rule status. Changes are saved automatically.
      </p>
    </div>
  );
}
