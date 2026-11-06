import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),

  // Protected application layout & routes
  layout("layouts/app.tsx", [
    route("dashboard", "routes/dashboard.tsx"),
    route("faculty", "routes/faculty.tsx"),
    route("classes", "routes/classes.tsx"),
    route("subjects", "routes/subjects.tsx"),
    route("classrooms", "routes/classrooms.tsx"),
    route("availability", "routes/availability.tsx"),
    route("requirements", "routes/requirements.tsx"),
    route("timetable", "routes/timetable.tsx"),
    route("timetable/generate", "routes/timetable-generate.tsx"),
    route("timetable/versions", "routes/timetable-versions.tsx"),
    route("workload", "routes/workload.tsx"),
    route("conflicts", "routes/conflicts.tsx"),
    route("reports", "routes/reports.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
] satisfies RouteConfig;
