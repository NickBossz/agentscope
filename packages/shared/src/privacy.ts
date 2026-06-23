import type { IngestionEvent } from "./ingestion";

export const redactedValue = "[REDACTED]";

export interface CaptureSettings {
  capturePrompts: boolean;
  captureResponses: boolean;
  redactedFields: readonly string[];
}

export interface PrivacyReport {
  redactedPaths: string[];
  removedPaths: string[];
}

export interface PrivacyResult {
  event: IngestionEvent;
  report: PrivacyReport;
}

const alwaysRedactedKeys = new Set([
  "authorization",
  "proxyauthorization",
  "xapikey",
  "apikey",
  "cookie",
  "setcookie",
]);

const secretPatterns = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/g,
  /\bas_(?:dev|stg|prod)_[0-9a-f]{12}_[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
] as const;

type MutableObject = Record<string, unknown>;

function normalizeKey(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function normalizeConfiguredPaths(paths: readonly string[]): string[][] {
  return paths
    .map((path) =>
      path
        .split(".")
        .map((segment) => segment.trim().toLowerCase())
        .filter(Boolean),
    )
    .filter((segments) => segments.length > 0);
}

function matchesConfiguredPath(
  path: readonly string[],
  configuredPaths: readonly string[][],
): boolean {
  const comparablePath = path.map((segment) => segment.toLowerCase());

  return configuredPaths.some((configuredPath) => {
    if (configuredPath.length === 1) {
      return configuredPath[0] === comparablePath.at(-1);
    }
    if (configuredPath.length > comparablePath.length) {
      return false;
    }

    const offset = comparablePath.length - configuredPath.length;
    return configuredPath.every(
      (segment, index) =>
        segment === "*" || segment === comparablePath[offset + index],
    );
  });
}

function redactSecrets(value: string): string {
  return secretPatterns.reduce(
    (safeValue, pattern) => safeValue.replace(pattern, redactedValue),
    value,
  );
}

function redactNestedValue(
  value: unknown,
  path: string[],
  configuredPaths: readonly string[][],
  redactedPaths: string[],
): unknown {
  if (typeof value === "string") {
    const safeValue = redactSecrets(value);
    if (safeValue !== value) {
      redactedPaths.push(path.join("."));
    }
    return safeValue;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      redactNestedValue(
        item,
        [...path, String(index)],
        configuredPaths,
        redactedPaths,
      ),
    );
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  const safeObject: MutableObject = {};
  for (const [key, childValue] of Object.entries(value)) {
    const childPath = [...path, key];
    if (
      alwaysRedactedKeys.has(normalizeKey(key)) ||
      matchesConfiguredPath(childPath, configuredPaths)
    ) {
      safeObject[key] = redactedValue;
      redactedPaths.push(childPath.join("."));
      continue;
    }

    safeObject[key] = redactNestedValue(
      childValue,
      childPath,
      configuredPaths,
      redactedPaths,
    );
  }
  return safeObject;
}

function removeCapturedContent(
  payload: MutableObject,
  settings: CaptureSettings,
  removedPaths: string[],
): MutableObject {
  const safePayload = { ...payload };

  if (!settings.capturePrompts && "input" in safePayload) {
    delete safePayload.input;
    removedPaths.push("payload.input");
  }
  if (!settings.captureResponses && "output" in safePayload) {
    delete safePayload.output;
    removedPaths.push("payload.output");
  }

  if (Array.isArray(safePayload.messages)) {
    const retainedMessages = safePayload.messages.filter((message) => {
      if (message === null || typeof message !== "object") {
        return false;
      }
      const role = Reflect.get(message, "role");
      const isResponse = role === "assistant" || role === "tool";
      return isResponse ? settings.captureResponses : settings.capturePrompts;
    });

    if (retainedMessages.length === 0) {
      delete safePayload.messages;
      removedPaths.push("payload.messages");
    } else if (retainedMessages.length !== safePayload.messages.length) {
      safePayload.messages = retainedMessages;
      removedPaths.push("payload.messages.filtered");
    }
  }

  if (Array.isArray(safePayload.toolCalls)) {
    safePayload.toolCalls = safePayload.toolCalls.map((toolCall, index) => {
      if (toolCall === null || typeof toolCall !== "object") {
        return toolCall;
      }

      const safeToolCall = { ...toolCall } as MutableObject;
      if (!settings.capturePrompts && "arguments" in safeToolCall) {
        delete safeToolCall.arguments;
        removedPaths.push(`payload.toolCalls.${index}.arguments`);
      }
      if (!settings.captureResponses && "result" in safeToolCall) {
        delete safeToolCall.result;
        removedPaths.push(`payload.toolCalls.${index}.result`);
      }
      return safeToolCall;
    });
  }

  return safePayload;
}

export function applyIngestionPrivacy(
  event: IngestionEvent,
  settings: CaptureSettings,
): PrivacyResult {
  const removedPaths: string[] = [];
  const redactedPaths: string[] = [];
  const payload = removeCapturedContent(
    event.payload as MutableObject,
    settings,
    removedPaths,
  );
  const safePayload = redactNestedValue(
    payload,
    ["payload"],
    normalizeConfiguredPaths(settings.redactedFields),
    redactedPaths,
  );

  return {
    event: { ...event, payload: safePayload } as IngestionEvent,
    report: { redactedPaths, removedPaths },
  };
}

export function sanitizeForLogging(value: unknown): unknown {
  return redactNestedValue(value, [], [], []);
}
