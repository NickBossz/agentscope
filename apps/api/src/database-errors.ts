interface ErrorWithCode {
  code?: unknown;
  cause?: unknown;
}

function errorWithCode(value: unknown): ErrorWithCode | null {
  return typeof value === "object" && value !== null
    ? (value as ErrorWithCode)
    : null;
}

export function databaseErrorCode(error: unknown): string | null {
  let current: unknown = error;
  const visited = new Set<object>();

  while (current !== null && typeof current === "object") {
    if (visited.has(current)) {
      return null;
    }
    visited.add(current);

    const candidate = errorWithCode(current);
    if (!candidate) {
      return null;
    }
    if (typeof candidate.code === "string") {
      return candidate.code;
    }
    current = candidate.cause;
  }

  return null;
}
