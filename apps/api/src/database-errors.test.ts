import { describe, expect, test } from "bun:test";
import { databaseErrorCode } from "./database-errors";

describe("databaseErrorCode", () => {
  test("reads a direct PostgreSQL error code", () => {
    expect(databaseErrorCode({ code: "23505" })).toBe("23505");
  });

  test("reads a PostgreSQL error code wrapped by the driver", () => {
    expect(databaseErrorCode({ cause: { code: "23505" } })).toBe("23505");
  });

  test("handles cyclic causes safely", () => {
    const error: { cause?: unknown } = {};
    error.cause = error;
    expect(databaseErrorCode(error)).toBeNull();
  });
});
