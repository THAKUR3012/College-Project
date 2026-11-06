# Automated Timetable Generation and Faculty Workload Management System

A production-ready, full-stack Automated Timetable Generation and Faculty Workload Management System built with **React Router v8 Framework Mode**, **TypeScript**, **MySQL 8**, **Drizzle ORM**, **Tailwind CSS**, and **shadcn/ui**.

---

## 🌟 Key Features

### 1. Constraint-Satisfaction Scheduling Engine (100% TypeScript)
- **Constraint Satisfaction & Optimization:** Combines backtracking search, MRV (Minimum Remaining Values), LCV (Least Constraining Value), and branch-and-bound optimization.
- **Hard Constraints Enforced:**
  - Zero faculty double-booking.
  - Zero classroom double-booking.
  - Zero class cohort double-booking.
  - 100% curriculum session fulfillment.
  - Faculty-subject qualification mapping.
  - Classroom capacity vs student enrollment sizing.
  - Room type compliance (practical labs only in computer/hardware labs).
  - Faculty unavailable periods strictly avoided.
  - Maximum weekly faculty workload ceilings maintained.
  - Consecutive period grouping for practical laboratory sessions.
- **Soft Constraints (Optimization Metric):**
  - Minimizes idle gap periods for faculty between classes.
  - Balances daily teaching workload variance across days.
  - Prevents excessive consecutive teaching fatigue.
  - Prioritizes faculty preferred time windows.
  - Spreads curriculum subjects evenly across days of the week.
- **Solver Diagnosis:** Provides instantaneous diagnosis for infeasible requirement scenarios.

### 2. Multi-Dimensional Interactive Timetable Grid
- **Class-wise View:** Inspect timetable for any student class (CSE-3A, CSE-3B, CSE-5A).
- **Faculty-wise View:** Inspect personal teaching timetable for any faculty instructor.
- **Classroom-wise View:** Inspect room occupancy and lab utilization.
- **Manual Slot Editing with Real-Time Conflict Detection:** Coordinators can click any slot to edit or move an assignment; all hard constraints are verified by the server loader/action and conflicting edits are strictly rejected.
- **Print & CSV Exports:** One-click CSV export and print-ready stylesheet formatting.

### 3. Faculty Workload & Utilization Analytics
- Comprehensive workload tracking against contractual maximum hours.
- Utilization status indicators (`Optimal`, `Near Capacity`, `Under-allocated`, `Over-capacity`).
- Departmental aggregates and daily distribution across Monday–Friday.
- Interactive Recharts bar charts comparing assigned hours against workload ceilings.

### 4. Role-Based Access Control (RBAC)
- **Administrator:** Full administrative control, user management, audit logs, and master settings.
- **Coordinator:** Management of faculty, classes, subjects, classrooms, teaching requirements, automated timetable generation, and publishing.
- **Faculty:** Personal schedule view, personal workload analytics, and availability configuration.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Full-Stack Framework** | React Router v8 (Framework Mode) with SSR, server loaders & actions |
| **Language** | TypeScript (Strict mode across frontend, backend & scheduling algorithm) |
| **Frontend UI** | React 19, Tailwind CSS, shadcn/ui design tokens, Lucide React |
| **Data Visualization** | Recharts |
| **Forms & Validation** | React Hook Form, Zod |
| **Database** | MySQL 8.0 |
| **ORM & Migrations** | Drizzle ORM (`drizzle-orm`) & Drizzle Kit (`drizzle-kit`) with `mysql2` |
| **Session & Security** | Cookie session storage with HTTP-only signed cookies & Bcrypt password hashing |
| **Containerization** | Docker & Docker Compose |

---

## 📁 Project Structure

```
.
├── app/
│   ├── algorithms/
│   │   ├── constraints.ts          # O(1) state tracker & hard constraint verification
│   │   ├── optimizer.ts            # Soft constraint scoring & penalty breakdown
│   │   ├── test-solver.ts          # Standalone solver test script
│   │   ├── timetable-generator.ts  # Backtracking & branch-and-bound engine
│   │   ├── types.ts                # Solver interfaces & type definitions
│   │   └── validation.ts           # Pre-solve diagnostic checks & full schedule audit
│   ├── components/
│   │   ├── layout/                 # Sidebar, Header, AppLayout
│   │   ├── timetable/              # Interactive TimetableGrid & Edit Modal
│   │   └── ui/                     # Button, Card, Badge, Modal, Input, Table, Tabs
│   ├── db/
│   │   ├── index.server.ts         # Singleton MySQL connection pool & Drizzle ORM
│   │   ├── schema/index.ts         # 23 normalized MySQL tables & relational mappings
│   │   └── seed.server.ts          # Realistic college dataset seeding
│   ├── layouts/
│   │   └── app.tsx                 # Protected layout with session authentication check
│   ├── routes/
│   │   ├── availability.tsx        # Faculty & room availability matrix
│   │   ├── classes.tsx             # Student class sections CRUD
│   │   ├── classrooms.tsx          # Classrooms & laboratories CRUD
│   │   ├── conflicts.tsx           # Conflict audit reports
│   │   ├── dashboard.tsx           # Main analytics dashboard & KPI cards
│   │   ├── faculty.tsx             # Faculty directory & qualification mappings
│   │   ├── home.tsx                # Index redirector
│   │   ├── login.tsx               # Auth page with quick demo login buttons
│   │   ├── logout.tsx              # Session sign-out action
│   │   ├── reports.tsx             # CSV exports & printable views
│   │   ├── requirements.tsx        # Curriculum teaching requirements allocation
│   │   ├── settings.tsx            # System settings & immutable audit logs
│   │   ├── subjects.tsx            # Subjects catalog CRUD
│   │   ├── timetable-generate.tsx  # Solver configuration & generation UI
│   │   ├── timetable-versions.tsx  # Version history, publishing & archiving
│   │   └── timetable.tsx           # Multi-dimensional timetable schedule viewer
│   ├── services/
│   │   ├── auth.server.ts          # Authentication, session cookies & RBAC guards
│   │   ├── class.server.ts         # Class service
│   │   ├── classroom.server.ts     # Classroom service
│   │   ├── faculty.server.ts       # Faculty service
│   │   ├── subject.server.ts       # Subject service
│   │   ├── timetable.server.ts     # Generation, publishing, and manual slot editing
│   │   └── workload.server.ts      # Faculty workload calculation & room utilization
│   ├── utils/
│   │   └── utils.ts                # Class merging & formatters
│   ├── app.css                     # Tailwind directives & CSS variable tokens
│   ├── entry.client.tsx            # React client hydration entry
│   ├── entry.server.tsx            # Server stream rendering entry
│   ├── root.tsx                    # Root layout with ErrorBoundary & HTML skeleton
│   └── routes.ts                   # Route configuration tree
├── docker-compose.yml              # Multi-container orchestration (MySQL + App)
├── Dockerfile                      # Multi-stage production container build
├── drizzle.config.ts               # Drizzle Kit configuration
├── package.json                    # Dependencies & npm scripts
├── react-router.config.ts          # React Router v8 Framework configuration
├── test-acceptance.ts              # Automated 9-point acceptance demonstration
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite build configuration
```

---

## 🗄️ Normalized MySQL Database Tables (23 Tables)

1. `users`: Credentials, full names, active statuses.
2. `roles`: Role definitions (`admin`, `coordinator`, `faculty`).
3. `faculty`: Faculty profiles, employee IDs, contractual workload limits.
4. `courses`: Degree courses and departments (e.g., B.Tech CSE).
5. `classes`: Student cohort sections and enrollment counts.
6. `subjects`: Subject codes, theory/practical/seminar types, consecutive slot flags.
7. `faculty_subjects`: Many-to-many instructor qualification mappings.
8. `classrooms`: Room numbers, facility types, floor levels, seating capacities.
9. `academic_years`: Academic calendar years (e.g., 2025–2026).
10. `semesters`: Term numbers and active statuses.
11. `working_days`: Active instructional days (Monday–Friday).
12. `periods`: Daily instructional time periods and time ranges.
13. `breaks`: Scheduled breaks (tea breaks, lunch breaks).
14. `faculty_availability`: Slot availability (`available`, `preferred`, `unavailable`).
15. `room_availability`: Classroom availability and maintenance reservations.
16. `teaching_requirements`: Curriculum allocation per class, subject, and instructor.
17. `fixed_sessions`: Pre-assigned immovable slots.
18. `timetable_versions`: Version iterations, statuses (`draft`, `published`, `archived`), scores.
19. `timetable_entries`: Schedule slots linking version, class, subject, instructor, room, day, period.
20. `assignments`: Consolidated instructor course allocations.
21. `solver_runs`: Algorithm metrics, execution times, iterations, diagnostic summaries.
22. `conflict_reports`: Hard and soft constraint audit logs.
23. `audit_logs`: Immutable security and operation audit trail.

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- **Node.js**: v20 or higher (v22 recommended)
- **Docker** and **Docker Compose** (for running MySQL 8)

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
DATABASE_URL="mysql://timetable_user:timetable_password@localhost:3306/timetable_db"
SESSION_SECRET="super-secret-session-key-change-in-production-32-chars-long"
PORT=3000
NODE_ENV=development
```

### 3. Start MySQL Container
```bash
docker compose up mysql -d
```

### 4. Push Schema & Seed Database
```bash
# Push Drizzle schema to MySQL
npm run db:push

# Seed initial academic dataset (3 classes, 6 faculty, 4 rooms, 5 days)
npm run db:seed
```

### 5. Build and Run the Application
```bash
# Production Build
npm run build

# Start Production Server
npm start
```
The application will be available at: **http://localhost:3000**

---

## 🔑 Default Credentials

| Role | Email | Password | Scope |
|---|---|---|---|
| **Administrator** | `admin@college.edu` | `Admin@123` | Full system control, audit logs, master data |
| **Coordinator** | `coordinator@college.edu` | `Coord@123` | Automated generation, publishing, manual slot edits |
| **Faculty** | `dr.sharma@college.edu` | `Faculty@123` | Personal timetable, personal workload, availability rules |
| **Faculty** | `dr.anita@college.edu` | `Faculty@123` | Personal timetable, personal workload, availability rules |

*Quick test accounts can also be filled with one click on the `/login` screen.*

---

## 🧪 Acceptance Demonstration Verification

Run the automated 9-point acceptance demonstration script:
```bash
npx tsx test-acceptance.ts
```

This verifies all 9 acceptance criteria specified in the project requirements:
1. **Automatic timetable generation:** Feasible schedule generated with zero clashes.
2. **All hard constraints validated:** Zero faculty, room, or class collisions; capacity and room types respected.
3. **Required vs assigned weekly sessions:** 100% match across all 12 curriculum requirements.
4. **Manual conflicting edits rejected:** Server actions strictly reject conflicts (e.g., unavailable slots, room type mismatch).
5. **Correct faculty workload calculation:** Faculty hours and utilization ratios accurately calculated.
6. **Intentionally infeasible scenario:** Infeasible inputs tested and caught.
7. **Clear infeasibility diagnosis:** Root cause diagnosis presented with exact explanations.
8. **Timetable versioning and publishing:** Draft version promoted to published status.
9. **Multi-dimensional views:** Class-wise, faculty-wise, and room-wise views verified.

---

## 🐳 Docker Deployment

To build and deploy the entire multi-container stack:
```bash
docker compose up --build -d
```
Access the application on port **3000**.
