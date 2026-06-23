import { describe, expect, test } from "bun:test";
import type { IngestionEvent } from "./ingestion";
import {
  applyIngestionPrivacy,
  redactedValue,
  sanitizeForLogging,
} from "./privacy";

const event: IngestionEvent = {
  version: "v1",
  eventId: "evt_span_001",
  occurredAt: "2026-06-22T12:00:00.000Z",
  type: "span.create",
  payload: {
    spanId: "span_001",
    traceId: "trace_001",
    name: "model-call",
    type: "llm",
    startedAt: "2026-06-22T12:00:00.000Z",
    input: {
      prompt: "Use Bearer abcdefghijklmnop",
      password: "keep-this-hidden",
    },
    output: { answer: "done", internal: "secret response" },
    messages: [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
      { role: "tool", content: { result: "42" } },
    ],
    metadata: {
      headers: {
        Authorization: "Bearer another-secret-token",
        "content-type": "application/json",
      },
      users: [
        { email: "one@example.com", password: "first" },
        { email: "two@example.com", password: "second" },
      ],
    },
    toolCalls: [
      {
        name: "lookup",
        arguments: { apiKey: "sk-abcdefghijklmnopqrstuv" },
        result: { value: "ok" },
        status: "success",
      },
    ],
    errors: [
      {
        category: "authentication",
        message: "Provider rejected sk-abcdefghijklmnopqrstuv",
        occurredAt: "2026-06-22T12:00:01.000Z",
      },
    ],
  },
};

describe("ingestion privacy", () => {
  test("redacts authorization headers, known secrets and configured fields", () => {
    const result = applyIngestionPrivacy(event, {
      capturePrompts: true,
      captureResponses: true,
      redactedFields: ["password", "output.internal"],
    });
    const payload = result.event.payload;
    if (result.event.type !== "span.create") {
      throw new Error("Expected a span event.");
    }

    expect(payload.input).toEqual({
      prompt: `Use ${redactedValue}`,
      password: redactedValue,
    });
    expect(payload.output).toEqual({
      answer: "done",
      internal: redactedValue,
    });
    expect(payload.metadata).toEqual({
      headers: {
        Authorization: redactedValue,
        "content-type": "application/json",
      },
      users: [
        { email: "one@example.com", password: redactedValue },
        { email: "two@example.com", password: redactedValue },
      ],
    });
    expect(payload.toolCalls?.[0]?.arguments).toEqual({
      apiKey: redactedValue,
    });
    expect(payload.errors?.[0]?.message).toBe(
      `Provider rejected ${redactedValue}`,
    );
    expect(result.report.redactedPaths).toContain(
      "payload.metadata.headers.Authorization",
    );
  });

  test("supports wildcard paths through nested arrays", () => {
    const result = applyIngestionPrivacy(event, {
      capturePrompts: true,
      captureResponses: true,
      redactedFields: ["metadata.users.*.email"],
    });
    if (result.event.type !== "span.create") {
      throw new Error("Expected a span event.");
    }

    expect(result.event.payload.metadata?.users).toEqual([
      { email: redactedValue, password: "first" },
      { email: redactedValue, password: "second" },
    ]);
  });

  test("removes prompt content without retaining it in the report", () => {
    const result = applyIngestionPrivacy(event, {
      capturePrompts: false,
      captureResponses: true,
      redactedFields: [],
    });
    if (result.event.type !== "span.create") {
      throw new Error("Expected a span event.");
    }

    expect(result.event.payload.input).toBeUndefined();
    expect(
      result.event.payload.messages?.map((message) => message.role),
    ).toEqual(["assistant", "tool"]);
    expect(result.event.payload.toolCalls?.[0]?.arguments).toBeUndefined();
    expect(JSON.stringify(result.report)).not.toContain("keep-this-hidden");
  });

  test("removes response content while preserving prompt content", () => {
    const result = applyIngestionPrivacy(event, {
      capturePrompts: true,
      captureResponses: false,
      redactedFields: [],
    });
    if (result.event.type !== "span.create") {
      throw new Error("Expected a span event.");
    }

    expect(result.event.payload.output).toBeUndefined();
    expect(
      result.event.payload.messages?.map((message) => message.role),
    ).toEqual(["system", "user"]);
    expect(result.event.payload.toolCalls?.[0]?.result).toBeUndefined();
    expect(result.event.payload.input).toBeDefined();
  });

  test("does not mutate the source event", () => {
    const original = structuredClone(event);
    applyIngestionPrivacy(event, {
      capturePrompts: false,
      captureResponses: false,
      redactedFields: ["password"],
    });

    expect(event).toEqual(original);
  });

  test("sanitizes sensitive data before structured logging", () => {
    const safeLog = sanitizeForLogging({
      authorization: "Bearer super-secret-token",
      nested: {
        api_key: "as_dev_0123456789ab_abcdefghijklmnopqrst",
        message: "Request used sk-abcdefghijklmnopqrstuv",
      },
      ordinary: "visible",
    });

    expect(safeLog).toEqual({
      authorization: redactedValue,
      nested: {
        api_key: redactedValue,
        message: `Request used ${redactedValue}`,
      },
      ordinary: "visible",
    });
  });
});
