import { describe, expect, test } from "bun:test";
import {
  apiKeyPrefix,
  createApiKey,
  hashSecret,
  parseCookies,
  secretsEqual,
} from "./security";

const pepper = "a-secret-that-is-long-enough-for-tests";

describe("security helpers", () => {
  test("creates API keys without exposing the secret in the prefix", () => {
    const key = createApiKey("production", pepper);
    expect(key.rawKey.startsWith(`${key.prefix}_`)).toBe(true);
    expect(apiKeyPrefix(key.rawKey)).toBe(key.prefix);
    expect(key.keyHash).toBe(hashSecret(key.rawKey, pepper));
    expect(key.keyHash.includes(key.rawKey)).toBe(false);
  });

  test("compares hashes in constant-time compatible buffers", () => {
    expect(secretsEqual("abc", "abc")).toBe(true);
    expect(secretsEqual("abc", "abd")).toBe(false);
    expect(secretsEqual("abc", "longer")).toBe(false);
  });

  test("parses cookie values containing encoded characters", () => {
    expect(parseCookies("one=1; token=a%3Db")).toEqual({
      one: "1",
      token: "a=b",
    });
  });
});
