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

  const [identifier, setIdentifier] = useState("kessc.edu.in");
  const [password, setPassword] = useState("kes@101");

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
                  placeholder="kessc.edu.in"
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

          {/* Single Authorized Login Info */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800">
            <div className="rounded-xl bg-[#f5f8fc] dark:bg-slate-950/80 p-3.5 border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Official College Login Credentials
              </p>
              <div className="inline-flex flex-wrap items-center justify-center gap-2 text-xs font-mono font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs">
                <span>User: <strong className="text-[#7d100b] dark:text-red-400">kessc.edu.in</strong></span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>Pass: <strong className="text-[#7d100b] dark:text-red-400">kes@101</strong></span>
              </div>
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
