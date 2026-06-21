import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Environment } from "@agentscope/shared";

const sessionCookieName = "agentscope_session";

export function hashSecret(secret: string, pepper: string): string {
  return createHmac("sha256", pepper).update(secret).digest("hex");
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function createApiKey(
  environment: Environment,
  pepper: string,
): {
  rawKey: string;
  prefix: string;
  keyHash: string;
} {
  const environmentCode: Record<Environment, string> = {
    development: "dev",
    staging: "stg",
    production: "prod",
  };
  const publicId = randomBytes(6).toString("hex");
  const prefix = `as_${environmentCode[environment]}_${publicId}`;
  const rawKey = `${prefix}_${createOpaqueToken()}`;
  return { rawKey, prefix, keyHash: hashSecret(rawKey, pepper) };
}

export function apiKeyPrefix(rawKey: string): string | null {
  const parts = rawKey.split("_");
  if (parts.length < 4 || parts[0] !== "as") {
    return null;
  }
  return parts.slice(0, 3).join("_");
}

export function secretsEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function parseCookies(
  cookieHeader: string | null,
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader.split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      if (separator < 1) {
        return [];
      }
      const key = part.slice(0, separator).trim();
      const value = part.slice(separator + 1).trim();
      return [[key, decodeURIComponent(value)]];
    }),
  );
}

export function sessionTokenFromRequest(request: Request): string | null {
  return parseCookies(request.headers.get("cookie"))[sessionCookieName] ?? null;
}

export function sessionCookie(
  token: string,
  expiresAt: Date,
  secure: boolean,
): string {
  const secureAttribute = secure ? "; Secure" : "";
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${secureAttribute}`;
}

export function expiredSessionCookie(secure: boolean): string {
  const secureAttribute = secure ? "; Secure" : "";
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureAttribute}`;
}
