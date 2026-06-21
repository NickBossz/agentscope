import type { Database } from "@agentscope/database";
import { sessions, users } from "@agentscope/database";
import { DomainError } from "@agentscope/shared";
import { and, eq, gt } from "drizzle-orm";
import { config } from "./config";
import { hashSecret, sessionTokenFromRequest } from "./security";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export async function requireUser(
  database: Database["db"],
  request: Request,
): Promise<AuthenticatedUser> {
  const token = sessionTokenFromRequest(request);
  if (!token) {
    throw new DomainError(
      "AUTHENTICATION_REQUIRED",
      "Authentication is required.",
      401,
    );
  }

  const tokenHash = hashSecret(token, config.AUTH_SECRET);
  const [result] = await database
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!result) {
    throw new DomainError(
      "INVALID_SESSION",
      "The session is invalid or expired.",
      401,
    );
  }

  return result;
}

export function requireSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(config.APP_URL).origin) {
    throw new DomainError(
      "INVALID_ORIGIN",
      "The request origin is not allowed.",
      403,
    );
  }
}
