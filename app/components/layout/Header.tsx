import React from "react";
import { Form, useLocation } from "react-router";
import { Menu, LogOut, Sun, Moon, Sparkles, Bell } from "lucide-react";
import { Button } from "~/components/ui/button";

interface HeaderProps {
  user: {
    fullName: string;
    email: string;
    role: {
      name: string;
    };
  };
  onMenuToggle: () => void;
}

export function Header({ user, onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    const isDarkStored = localStorage.getItem("theme") === "dark";
    setIsDark(isDarkStored);
    if (isDarkStored) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  // Human friendly page title from path
  const getPageTitle = (path: string) => {
    if (path.startsWith("/timetable/generate")) return "Automated Generator";
    if (path.startsWith("/timetable/versions")) return "Version Management";
    if (path.startsWith("/timetable")) return "Timetable Schedules";
    if (path.startsWith("/faculty")) return "Faculty Management";
    if (path.startsWith("/classes")) return "Class Sections";
    if (path.startsWith("/subjects")) return "Subject Catalog";
    if (path.startsWith("/classrooms")) return "Classrooms & Labs";
    if (path.startsWith("/availability")) return "Availability Configuration";
    if (path.startsWith("/requirements")) return "Teaching Requirements";
    if (path.startsWith("/workload")) return "Faculty Workload Analytics";
    if (path.startsWith("/conflicts")) return "Conflict Audit Reports";
    if (path.startsWith("/reports")) return "Reports & Exports";
    if (path.startsWith("/settings")) return "System Settings";
    return "Operations Dashboard";
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="lg:hidden text-slate-600 dark:text-slate-300"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>

        <img
          src="https://kessc.edu.in/wp-content/uploads/2024/05/logo.png"
          alt="KESSC Logo"
          className="h-8 w-8 object-contain lg:hidden"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/logo.png";
          }}
        />

        <div>
          <h1 className="text-base font-semibold text-[#2b2b2b] dark:text-white sm:text-lg">
            {getPageTitle(location.pathname)}
          </h1>
          <p className="hidden text-xs text-slate-500 sm:block">
            KES Shroff College &bull; Academic Year 2025-2026 &bull; Operations Portal
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="h-9 w-9 text-slate-600 dark:text-slate-300"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200 dark:border-slate-800">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {user.fullName}
            </p>
            <p className="text-[11px] text-slate-400 capitalize">{user.role.name}</p>
          </div>

          <Form method="post" action="/logout">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              title="Sign Out"
              className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </Form>
        </div>
      </div>
    </header>
  );
}
