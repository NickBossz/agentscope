import { describe, expect, test } from "bun:test";
import { calculateEstimatedCost } from "./cost";

describe("cost calculation", () => {
  test("calculates input, output and cached cost with decimal-safe arithmetic", () => {
    expect(
      calculateEstimatedCost({
        inputTokens: 1_000,
        outputTokens: 500,
        cachedTokens: 250,
        inputPricePerMillion: "2.500000000000",
        outputPricePerMillion: "10.000000000000",
        cachedInputPricePerMillion: "1.250000000000",
      }),
    ).toBe("0.007812500000");
  });

  test("preserves precision for very small components", () => {
    expect(
      calculateEstimatedCost({
        inputTokens: 1,
        inputPricePerMillion: "0.123456000000",
      }),
    ).toBe("0.000000123456");
  });

  test("returns unknown when a reported token component has no price", () => {
    expect(
      calculateEstimatedCost({
        inputTokens: 10,
        inputPricePerMillion: null,
      }),
    ).toBeNull();
  });

  test("distinguishes absent tokens from explicitly reported zero", () => {
    expect(calculateEstimatedCost({})).toBeNull();
    expect(
      calculateEstimatedCost({
        outputTokens: 0,
        outputPricePerMillion: "10.000000000000",
      }),
    ).toBe("0.000000000000");
  });
});
