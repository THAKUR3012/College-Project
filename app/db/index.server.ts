import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema/index";

declare global {
  // eslint-disable-next-line no-var
  var __dbPool: mysql.Pool | undefined;
}

const connectionUrl =
  process.env.DATABASE_URL ||
  "mysql://timetable_user:timetable_password@localhost:3306/timetable_db";

function createPool(): mysql.Pool {
  return mysql.createPool({
    uri: connectionUrl,
    waitForConnections: true,
    connectionLimit: 15,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
}

const pool = global.__dbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  global.__dbPool = pool;
}

export const db = drizzle(pool, { schema, mode: "default" });
export { pool, schema };
