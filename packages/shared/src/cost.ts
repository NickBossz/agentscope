export interface CostInput {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  cachedTokens?: number | undefined;
  inputPricePerMillion?: string | null | undefined;
  outputPricePerMillion?: string | null | undefined;
  cachedInputPricePerMillion?: string | null | undefined;
}

const costScale = 12;
const priceScale = 12;
const million = 1_000_000n;
const scaleFactor = 10n ** BigInt(priceScale);

function parseDecimal(value: string): bigint {
  const match = value.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match?.[1]) {
    throw new Error("Price must be a non-negative decimal string.");
  }
  const fraction = (match[2] ?? "")
    .padEnd(priceScale, "0")
    .slice(0, priceScale);
  return BigInt(match[1]) * scaleFactor + BigInt(fraction);
}

function componentCost(tokens: number, price: string): bigint {
  return (BigInt(tokens) * parseDecimal(price)) / million;
}

function formatScaled(value: bigint): string {
  const whole = value / scaleFactor;
  const fraction = (value % scaleFactor).toString().padStart(costScale, "0");
  return `${whole}.${fraction}`;
}

export function calculateEstimatedCost(input: CostInput): string | null {
  let total = 0n;
  let hasKnownComponent = false;

  const components = [
    [input.inputTokens, input.inputPricePerMillion],
    [input.outputTokens, input.outputPricePerMillion],
    [input.cachedTokens, input.cachedInputPricePerMillion],
  ] as const;

  for (const [tokens, price] of components) {
    if (tokens === undefined) {
      continue;
    }
    if (price === undefined || price === null) {
      return null;
    }
    total += componentCost(tokens, price);
    hasKnownComponent = true;
  }

  return hasKnownComponent ? formatScaled(total) : null;
}
