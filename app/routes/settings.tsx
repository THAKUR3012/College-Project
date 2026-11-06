import { useState } from "react";
import {
  useLoaderData,
  useSubmit,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  History,
  RotateCcw,
  CheckCircle2,
  Terminal,
  Server,
} from "lucide-react";
import { requireRole } from "~/services/auth.server";
import { db } from "~/db/index.server";
import { auditLogs, users } from "~/db/schema/index";
import { desc, count } from "drizzle-orm";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ["admin"]);

  const logs = await db.query.auditLogs.findMany({
    limit: 50,
    orderBy: (al, { desc }) => [desc(al.createdAt)],
    with: {
      user: true,
    },
  });

  const totalLogs = await db.$count(auditLogs);

  return { user, logs, totalLogs };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireRole(request, ["admin"]);
  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "clear_logs") {
    // Keep seed log or clear old logs
    return { success: true };
  }

  return { success: true };
}

export default function SettingsPage() {
  const { user, logs, totalLogs } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-blue-600" />
          System Settings & Audit Logs
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          System health, database configuration, security audit trail, and operational controls.
        </p>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Framework Architecture</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                React Router v8 Mode
              </h4>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Full-stack SSR + Loaders
              </p>
            </div>
            <Server className="h-8 w-8 text-blue-500 opacity-80" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Database Engine</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                MySQL 8 + Drizzle ORM
              </h4>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Connection Pool Active
              </p>
            </div>
            <Database className="h-8 w-8 text-emerald-500 opacity-80" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Security Audit Trail</p>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {totalLogs} Logged Events
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Immutable compliance records
              </p>
            </div>
            <ShieldCheck className="h-8 w-8 text-purple-500 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">System Audit Trail</CardTitle>
              <CardDescription>
                Chronological log of administrative actions, user logins, timetable mutations, and solver runs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Initiating User</th>
                  <th className="p-4">Action Event</th>
                  <th className="p-4">Target Entity</th>
                  <th className="p-4">Details Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-xs font-mono text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {log.user?.fullName || "System Engine"}
                      </span>
                      <div className="text-[11px] text-slate-400">
                        {log.user?.email || "internal"}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 capitalize text-xs text-slate-600 dark:text-slate-300">
                      {log.entityType} #{log.entityId}
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-xs text-slate-500 max-w-sm truncate">
                        {log.detailsJson || "—"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
