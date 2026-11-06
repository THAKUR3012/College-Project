import { createCookieSessionStorage, redirect } from "react-router";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "~/db/index.server";
import { users, roles, faculty, auditLogs } from "~/db/schema/index";

const sessionSecret =
  process.env.SESSION_SECRET || "timetable-super-secret-key-default-32-chars-long";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__timetable_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
});

export async function getUserSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserId(request: Request): Promise<number | null> {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  return typeof userId === "number" ? userId : null;
}

export async function getCurrentUser(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return null;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        role: true,
        faculty: true,
      },
    });

    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(request: Request) {
  const user = await getCurrentUser(request);
  if (!user) {
    const url = new URL(request.url);
    const redirectTo = encodeURIComponent(url.pathname + url.search);
    throw redirect(`/login?redirectTo=${redirectTo}`);
  }
  return user;
}

export async function requireRole(request: Request, allowedRoles: string[]) {
  const user = await requireUser(request);
  if (!allowedRoles.includes(user.role.name)) {
    throw redirect("/dashboard?error=UnauthorizedAccess");
  }
  return user;
}

export async function verifyLogin(identifier: string, password: string) {
  const trimmed = identifier.trim().toLowerCase();
  const user = await db.query.users.findFirst({
    where: (table, { or, eq }) =>
      or(eq(table.email, trimmed), eq(table.username, trimmed)),
    with: {
      role: true,
      faculty: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function createUserSession(
  request: Request,
  userId: number,
  redirectTo: string
) {
  const session = await getUserSession(request);
  session.set("userId", userId);

  // Log login audit
  try {
    await db.insert(auditLogs).values({
      userId,
      action: "USER_LOGIN",
      entityType: "user",
      entityId: userId,
      detailsJson: JSON.stringify({
        timestamp: new Date().toISOString(),
        userAgent: request.headers.get("user-agent"),
      }),
    });
  } catch (err) {
    console.error("Failed to write audit log on login:", err);
  }

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (userId) {
    try {
      await db.insert(auditLogs).values({
        userId,
        action: "USER_LOGOUT",
        entityType: "user",
        entityId: userId,
        detailsJson: JSON.stringify({ timestamp: new Date().toISOString() }),
      });
    } catch (err) {
      console.error("Failed to write audit log on logout:", err);
    }
  }

  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
