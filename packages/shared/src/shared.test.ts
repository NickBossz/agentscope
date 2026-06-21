import { describe, expect, test } from "bun:test";
import { createProjectSchema, hasMinimumRole, signUpSchema } from "./index";

describe("shared contracts", () => {
  test("normalizes signup email", () => {
    const result = signUpSchema.parse({
      name: "Ada",
      email: " ADA@EXAMPLE.COM ",
      password: "a-strong-password",
    });
    expect(result.email).toBe("ada@example.com");
  });

  test("rejects invalid project slugs", () => {
    expect(() =>
      createProjectSchema.parse({
        organizationId: crypto.randomUUID(),
        name: "Agent API",
        slug: "Agent API",
      }),
    ).toThrow();
  });

  test("enforces the role hierarchy", () => {
    expect(hasMinimumRole("owner", "admin")).toBe(true);
    expect(hasMinimumRole("viewer", "developer")).toBe(false);
  });
});
