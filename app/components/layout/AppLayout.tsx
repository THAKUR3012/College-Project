import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppLayoutProps {
  user: {
    fullName: string;
    email: string;
    role: {
      name: string;
    };
  };
  children: React.ReactNode;
}

export function AppLayout({ user, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-[#f5f8fc] dark:bg-slate-950 text-[#2b2b2b] dark:text-slate-100 flex">
      {/* Sidebar navigation */}
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content body */}
      <div className="flex flex-1 flex-col lg:pl-72 min-w-0 transition-all">
        <Header user={user} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
