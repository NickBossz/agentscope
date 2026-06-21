import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionErrorCodes = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "57P01",
  "57P02",
  "57P03",
  "ECONNREFUSED",
  "ECONNRESET",
  "EPIPE",
  "ETIMEDOUT",
]);

interface ErrorWithConnectionMetadata {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
}

function errorMetadata(error: unknown): ErrorWithConnectionMetadata | null {
  return typeof error === "object" && error !== null
    ? (error as ErrorWithConnectionMetadata)
    : null;
}

export function isDatabaseConnectionError(error: unknown): boolean {
  const visited = new Set<unknown>();
  let current: unknown = error;

  while (current && !visited.has(current)) {
    visited.add(current);
    const metadata = errorMetadata(current);
    if (!metadata) {
      return false;
    }

    if (
      typeof metadata.code === "string" &&
      connectionErrorCodes.has(metadata.code)
    ) {
      return true;
    }

    if (
      typeof metadata.message === "string" &&
      /connection terminated|connection closed|server closed the connection|socket closed/i.test(
        metadata.message,
      )
    ) {
      return true;
    }

    current = metadata.cause;
  }

  return false;
}

function createPool(databaseUrl: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    keepAlive: true,
  });
}

export function createDatabase(databaseUrl: string) {
  let pool = createPool(databaseUrl);
  let db = drizzle({ client: pool, schema });

  function reset(): void {
    const previousPool = pool;
    pool = createPool(databaseUrl);
    db = drizzle({ client: pool, schema });
    void previousPool.end().catch(() => undefined);
  }

  return {
    get db() {
      return db;
    },
    get pool() {
      return pool;
    },
    reset,
  };
}

export type Database = ReturnType<typeof createDatabase>;
