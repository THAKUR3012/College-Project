import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import stylesheet from "./app.css?url";

export const links: Route.LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="https://kessc.edu.in/wp-content/uploads/2024/05/logo.png" />
        <title>KES Shroff College - Automated Academic Scheduling & Workload Suite</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full font-sans antialiased bg-[#f5f8fc] text-[#2b2b2b] dark:bg-slate-950 dark:text-slate-100">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-8 shadow-xl border border-slate-200 dark:border-slate-800 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
          ⚠️
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
          Application Error
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{message}</p>
        {stack && (
          <pre className="mt-4 max-h-40 overflow-auto rounded bg-slate-100 dark:bg-slate-800 p-3 text-left text-xs font-mono text-slate-700 dark:text-slate-300">
            {stack}
          </pre>
        )}
        <div className="mt-6 flex justify-center gap-3">
          <a
            href="/dashboard"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
          >
            Go to Dashboard
          </a>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Reload Page
          </button>
        </div>
      </div>
    </main>
  );
}
