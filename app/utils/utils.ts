import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHours = hours % 12 || 12;
  return `${formattedHours}:${minutes} ${ampm}`;
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "optimal":
    case "published":
    case "available":
    case "active":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "feasible":
    case "draft":
    case "preferred":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "near_capacity":
    case "warning":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "infeasible":
    case "over_capacity":
    case "unavailable":
    case "error":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "archived":
    default:
      return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
  }
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatDateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getTodayDateString(): string {
  return formatDateToISO(new Date());
}

export function adjustDateString(dateStr: string, days: number): string {
  const dt = parseDateString(dateStr);
  dt.setDate(dt.getDate() + days);
  return formatDateToISO(dt);
}

export function getMondayOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday;
}

export interface DayInfo {
  dateObj: Date;
  dateStr: string;
  dayName: string;
  isWorkingDay: boolean;
  workingDay: { id: number; dayName: string; dayOrder: number } | null;
  formattedDate: string;
  shortFormattedDate: string;
  monthDay: string;
}

export function getDayInfoFromDate(
  dateStr: string,
  workingDaysList: Array<{ id: number; dayName: string; dayOrder: number }>
): DayInfo {
  const dateObj = parseDateString(dateStr);
  const dayIndex = dateObj.getDay();
  const dayName = DAY_NAMES[dayIndex];

  const matched = workingDaysList.find(
    (wd) => wd.dayName.toLowerCase() === dayName.toLowerCase()
  ) || null;

  return {
    dateObj,
    dateStr,
    dayName,
    isWorkingDay: !!matched,
    workingDay: matched,
    formattedDate: dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    shortFormattedDate: dateObj.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    monthDay: dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  };
}

export function getWeekDatesMap(
  referenceDateStr: string,
  workingDaysList: Array<{ id: number; dayName: string; dayOrder: number }>
): Map<number, { dateStr: string; formatted: string; monthDay: string }> {
  const ref = parseDateString(referenceDateStr);
  const monday = getMondayOfWeek(ref);

  const map = new Map<number, { dateStr: string; formatted: string; monthDay: string }>();

  workingDaysList.forEach((wd) => {
    // dayOrder 1 corresponds to Monday (0 days from Monday), 2 -> Tuesday (+1), etc.
    const offset = Math.max(0, wd.dayOrder - 1);
    const dateForDay = new Date(monday);
    dateForDay.setDate(monday.getDate() + offset);

    const dateStr = formatDateToISO(dateForDay);
    const monthDay = dateForDay.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const formatted = dateForDay.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    map.set(wd.id, { dateStr, formatted, monthDay });
  });

  return map;
}

export function getNextWorkingDate(
  dateStr: string,
  workingDaysList: Array<{ id: number; dayName: string; dayOrder: number }>
): string {
  let cur = parseDateString(dateStr);
  for (let i = 0; i < 7; i++) {
    const dayName = DAY_NAMES[cur.getDay()];
    const matched = workingDaysList.find(
      (wd) => wd.dayName.toLowerCase() === dayName.toLowerCase()
    );
    if (matched) {
      return formatDateToISO(cur);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dateStr;
}
