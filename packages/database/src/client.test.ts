import { describe, expect, test } from "bun:test";
import { isDatabaseConnectionError } from "./client";

describe("database connection errors", () => {
  test("recognizes PostgreSQL shutdown errors", () => {
    expect(isDatabaseConnectionError({ code: "57P01" })).toBe(true);
  });

  test("recognizes nested socket errors", () => {
    expect(
      isDatabaseConnectionError({
        cause: { code: "ECONNRESET" },
      }),
    ).toBe(true);
  });

  test("recognizes connection termination messages", () => {
    expect(
      isDatabaseConnectionError(
        new Error("Connection terminated unexpectedly"),
      ),
    ).toBe(true);
  });

  test("does not classify constraint errors as connection failures", () => {
    expect(isDatabaseConnectionError({ code: "23505" })).toBe(false);
  });
});
