import { useState } from "react";
import {
  Form,
  redirect,
  useActionData,
  useNavigation,
  useSearchParams,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "react-router";
import { Calendar, Shield, User, Lock, ArrowRight, AlertCircle, Sparkles } from "lucide-react";
import { getCurrentUser, verifyLogin, createUserSession } from "~/services/auth.server";
import { Button } from "~/components/ui/button";
import { Input, Label } from "~/components/ui/input";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getCurrentUser(request);
  if (user) {
    return redirect("/dashboard");
  }
  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const identifier = formData.get("identifier")?.toString();
  const password = formData.get("password")?.toString();
  const redirectTo = formData.get("redirectTo")?.toString() || "/dashboard";

  if (!identifier || !password) {
    return { error: "Please enter your email or username and password." };
  }

  const user = await verifyLogin(identifier, password);
  if (!user) {
    return { error: "Invalid credentials. Please check your username and password." };
  }

  return createUserSession(request, user.id, redirectTo);
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const isSubmitting = navigation.state === "submitting";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const fillCredentials = (id: string, pwd: string) => {
    setIdentifier(id);
    setPassword(pwd);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-[#f5f8fc] dark:bg-slate-950 text-[#2b2b2b] dark:text-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand / Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white p-2 shadow-lg shadow-slate-200/50 border border-slate-200 dark:border-slate-800">
            <img
              src="https://kessc.edu.in/wp-content/uploads/2024/05/logo.png"
              alt="KES Shroff College Logo"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.png";
              }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2b2b2b] dark:text-white">
              KES Shroff College
            </h1>
            <p className="text-sm font-semibold text-[#7d100b] dark:text-red-400">
              Automated Timetable Suite
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Constraint-Based Scheduling & Faculty Workload Management
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <Form method="post" className="space-y-4">
            <input type="hidden" name="redirectTo" value={redirectTo} />

            {actionData?.error && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{actionData.error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email or Username</Label>
              <div className="relative">
                <Input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder="admin@college.edu"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoFocus
                  className="pl-9"
                />
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-9"
                />
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 gap-2 font-semibold shadow-md shadow-blue-500/20"
            >
              {isSubmitting ? (
                "Signing In..."
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </Form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">
              Quick Test Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillCredentials("admin@college.edu", "Admin@123")}
                className="p-2 text-center rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-950/30 hover:bg-purple-100/60 text-purple-700 dark:text-purple-300 transition-colors"
              >
                <span className="block text-[11px] font-bold">Admin</span>
                <span className="block text-[9px] text-purple-600/70 dark:text-purple-400/70">Full Access</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("coordinator@college.edu", "Coord@123")}
                className="p-2 text-center rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 text-blue-700 dark:text-blue-300 transition-colors"
              >
                <span className="block text-[11px] font-bold">Coordinator</span>
                <span className="block text-[9px] text-blue-600/70 dark:text-blue-400/70">Scheduling</span>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials("dr.sharma@college.edu", "Faculty@123")}
                className="p-2 text-center rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60 text-emerald-700 dark:text-emerald-300 transition-colors"
              >
                <span className="block text-[11px] font-bold">Faculty</span>
                <span className="block text-[9px] text-emerald-600/70 dark:text-emerald-400/70">Lectures</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400">
          Powered by React Router v8 &bull; MySQL 8 &bull; TypeScript Solver Engine
        </p>
      </div>
    </div>
  );
}
