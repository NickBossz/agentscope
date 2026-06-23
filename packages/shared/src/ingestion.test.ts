import { describe, expect, test } from "bun:test";
import {
  createSpanSchema,
  createTraceSchema,
  ingestionBatchSchema,
  ingestionEventSchema,
  ingestionLimits,
  tokenUsageSchema,
  updateTraceSchema,
} from "./ingestion";

const occurredAt = "2026-06-22T12:00:00.000Z";

function traceEvent(eventId = "evt_trace_001") {
  return {
    version: "v1",
    eventId,
    occurredAt,
    type: "trace.create",
    payload: {
      traceId: "trace_001",
      name: "support-agent",
      environment: "development",
      status: "running",
      startedAt: occurredAt,
      input: { question: "Where is my order?" },
      model: {
        provider: "openai",
        name: "example-model",
        parameters: { temperature: 0 },
      },
      tokens: { input: 10, output: 0, total: 10 },
      tags: ["support"],
      metadata: { channel: "web" },
    },
  } as const;
}

describe("ingestion contracts", () => {
  test("accepts a valid versioned trace event and preserves zero values", () => {
    const event = ingestionEventSchema.parse(traceEvent());

    expect(event.type).toBe("trace.create");
    if (event.type === "trace.create") {
      expect(event.payload.tokens?.output).toBe(0);
      expect(event.payload.model?.parameters?.temperature).toBe(0);
    }
  });

  test("accepts an out-of-order span with a parent not yet present", () => {
    const span = createSpanSchema.parse({
      spanId: "span_child",
      traceId: "trace_001",
      parentSpanId: "span_parent",
      name: "model-call",
      type: "llm",
      status: "running",
      startedAt: occurredAt,
    });

    expect(span.parentSpanId).toBe("span_parent");
  });

  test("accepts a root span with an explicit null parent", () => {
    const span = createSpanSchema.parse({
      spanId: "span_root",
      traceId: "trace_001",
      parentSpanId: null,
      name: "agent-run",
      type: "agent",
      startedAt: occurredAt,
    });

    expect(span.parentSpanId).toBeNull();
  });

  test("rejects unknown event types and unknown payload fields", () => {
    expect(() =>
      ingestionEventSchema.parse({ ...traceEvent(), type: "trace.delete" }),
    ).toThrow();
    expect(() =>
      createTraceSchema.parse({
        ...traceEvent().payload,
        organizationId: crypto.randomUUID(),
      }),
    ).toThrow();
  });

  test("rejects malformed IDs and timestamps without timezone", () => {
    expect(() =>
      createTraceSchema.parse({
        ...traceEvent().payload,
        traceId: "contains spaces",
      }),
    ).toThrow();
    expect(() =>
      createTraceSchema.parse({
        ...traceEvent().payload,
        startedAt: "2026-06-22T12:00:00",
      }),
    ).toThrow();
    expect(() =>
      createTraceSchema.parse({
        ...traceEvent().payload,
        startedAt: "2026-06-22T09:00:00-03:00",
      }),
    ).toThrow();
  });

  test("rejects inconsistent timestamps and durations", () => {
    expect(() =>
      createTraceSchema.parse({
        ...traceEvent().payload,
        endedAt: "2026-06-22T11:59:59.000Z",
      }),
    ).toThrow();
    expect(() =>
      createTraceSchema.parse({
        ...traceEvent().payload,
        endedAt: "2026-06-22T12:00:01.000Z",
        durationMs: 999,
      }),
    ).toThrow();
  });

  test("requires an update to contain a changed field", () => {
    expect(() => updateTraceSchema.parse({ traceId: "trace_001" })).toThrow();
    expect(
      updateTraceSchema.parse({ traceId: "trace_001", status: "success" })
        .status,
    ).toBe("success");
  });

  test("validates token totals without treating absent values as zero fields", () => {
    expect(tokenUsageSchema.parse({ output: 0 })).toEqual({ output: 0 });
    expect(
      tokenUsageSchema.parse({
        input: 10,
        output: 5,
        cached: 4,
        reasoning: 2,
        total: 15,
      }).total,
    ).toBe(15);
    expect(() =>
      tokenUsageSchema.parse({ input: 10, output: 5, total: 14 }),
    ).toThrow();
  });

  test("enforces content and batch limits", () => {
    expect(() =>
      createTraceSchema.parse({
        ...traceEvent().payload,
        input: "x".repeat(ingestionLimits.contentBytes + 1),
      }),
    ).toThrow();

    const maximumBatch = Array.from(
      { length: ingestionLimits.batchEvents },
      (_, index) => traceEvent(`evt_${index}`),
    );
    expect(
      ingestionBatchSchema.parse({ version: "v1", events: maximumBatch })
        .events,
    ).toHaveLength(ingestionLimits.batchEvents);
    expect(() =>
      ingestionBatchSchema.parse({
        version: "v1",
        events: [...maximumBatch, traceEvent("evt_overflow")],
      }),
    ).toThrow();
  });

  test("rejects duplicate event IDs inside one batch", () => {
    expect(() =>
      ingestionBatchSchema.parse({
        version: "v1",
        events: [traceEvent(), traceEvent()],
      }),
    ).toThrow();
  });
});
