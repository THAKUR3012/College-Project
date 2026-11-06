import React from "react";
import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Calendar,
  Sparkles,
  History,
  Users,
  GraduationCap,
  BookOpen,
  DoorOpen,
  Clock,
  ClipboardList,
  BarChart3,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { cn } from "~/utils/utils";
import { Badge } from "~/components/ui/badge";

interface SidebarProps {
  user: {
    fullName: string;
    role: {
      name: string;
    };
  };
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const roleName = user.role.name; // 'admin', 'coordinator', 'faculty'

  const navItems = [
    {
      title: "Main",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "coordinator", "faculty"] },
        { label: "Timetable Grid", href: "/timetable", icon: Calendar, roles: ["admin", "coordinator", "faculty"] },
        { label: "Auto Generator", href: "/timetable/generate", icon: Sparkles, roles: ["admin", "coordinator"], highlight: true },
        { label: "Version History", href: "/timetable/versions", icon: History, roles: ["admin", "coordinator"] },
      ],
    },
    {
      title: "Academic Master Data",
      items: [
        { label: "Faculty Directory", href: "/faculty", icon: Users, roles: ["admin", "coordinator"] },
        { label: "Classes & Sections", href: "/classes", icon: GraduationCap, roles: ["admin", "coordinator"] },
        { label: "Subjects Catalog", href: "/subjects", icon: BookOpen, roles: ["admin", "coordinator"] },
        { label: "Classrooms & Labs", href: "/classrooms", icon: DoorOpen, roles: ["admin", "coordinator"] },
      ],
    },
    {
      title: "Scheduling Configuration",
      items: [
        { label: "Availability Rules", href: "/availability", icon: Clock, roles: ["admin", "coordinator", "faculty"] },
        { label: "Teaching Requirements", href: "/requirements", icon: ClipboardList, roles: ["admin", "coordinator"] },
      ],
    },
    {
      title: "Analytics & Compliance",
      items: [
        { label: "Faculty Workload", href: "/workload", icon: BarChart3, roles: ["admin", "coordinator", "faculty"] },
        { label: "Conflict Reports", href: "/conflicts", icon: AlertTriangle, roles: ["admin", "coordinator"] },
        { label: "Reports & Exports", href: "/reports", icon: FileSpreadsheet, roles: ["admin", "coordinator", "faculty"] },
        { label: "System Settings", href: "/settings", icon: Settings, roles: ["admin"] },
      ],
    },
  ];

  const roleBadgeStyle = {
    admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200",
    coordinator: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200",
    faculty: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200",
  }[roleName] || "bg-slate-100 text-slate-700";

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-950 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm border border-slate-200 dark:border-slate-700">
              <img
                src="https://kessc.edu.in/wp-content/uploads/2024/05/logo.png"
                alt="KESSC Logo"
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo.png";
                }}
              />
            </div>
            <div className="truncate">
              <span className="text-sm font-bold tracking-tight text-[#2b2b2b] dark:text-white flex items-center gap-1 truncate">
                KES Shroff College
              </span>
              <span className="block text-[11px] font-semibold text-[#7d100b] dark:text-red-400 truncate">
                Timetable AI Suite
              </span>
            </div>
          </Link>
        </div>

        {/* User Role Card */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                {user.fullName}
              </p>
              <p className="text-[11px] text-slate-500 capitalize">
                Role: <span className="font-medium text-slate-700 dark:text-slate-300">{roleName}</span>
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase border",
                roleBadgeStyle
              )}
            >
              {roleName}
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {navItems.map((group, gIdx) => {
            const visibleItems = group.items.filter((item) => item.roles.includes(roleName));
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
                  {group.title}
                </p>
                <div className="space-y-0.5 pt-1">
                  {visibleItems.map((item) => {
                    const isActive =
                      item.href === "/timetable"
                        ? location.pathname === "/timetable"
                        : location.pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-semibold"
                            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon
                            className={cn(
                              "h-4 w-4 transition-colors",
                              isActive
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
                              item.highlight && !isActive && "text-blue-500"
                            )}
                          />
                          <span>{item.label}</span>
                        </div>
                        {item.highlight && (
                          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center">
          KES Shroff College &bull; Academic Timetable Suite
        </div>
      </aside>
    </>
  );
}
