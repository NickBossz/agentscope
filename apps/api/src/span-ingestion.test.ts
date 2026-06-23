import { describe, expect, test } from "bun:test";
import {
  DomainError,
  errorEnvelope,
  type SpanCreateEvent,
} from "@agentscope/shared";
import { Elysia } from "elysia";
import { ZodError } from "zod";
import type { AuthenticatedProjectKey } from "./api-key-auth";
import type { IngestionAdmission } from "./ingestion-admission";
import type {
  IngestionPublisher,
  QueuedIngestionEvent,
} from "./ingestion-queue";
import { createSpanIngestionRoutes } from "./span-ingestion";

const access: AuthenticatedProjectKey = {
  apiKeyId: "api-key-id",
  projectId: "project-id",
  organizationId: "organization-id",
  environment: "development",
  settings: {
    capturePrompts: true,
    captureResponses: false,
    redactedFields: ["password"],
  },
};

function spanEvent(): SpanCreateEvent {
  return {
    version: "v1",
    eventId: "evt_span_001",
    occurredAt: "2026-06-22T12:00:01.000Z",
    type: "span.create",
    payload: {
      spanId: "span_child",
      traceId: "trace_001",
      parentSpanId: "span_parent_not_ingested_yet",
      name: "model-call",
      type: "llm",
      startedAt: "2026-06-22T12:00:01.000Z",
      input: { password: "secret", prompt: "hello" },
      output: { answer: "hidden" },
    },
  };
}

function createTestContext() {
  const messages: QueuedIngestionEvent[] = [];
  const publisher: IngestionPublisher = {
    async publish(message) {
      messages.push(message);
      return "2-0";
    },
  };
  const admission: IngestionAdmission = {
    async checkRateLimit() {},
    async reserve() {
      return { duplicate: false };
    },
    async markQueued() {},
    async release() {},
  };
  const app = new Elysia()
    .onError(({ error, set }) => {
      if (error instanceof DomainError) {
        set.status = error.status;
        return errorEnvelope(error);
      }
      if (error instanceof ZodError) {
        set.status = 400;
        return {
          error: {
            code: "VALIDATION_ERROR",
            message: "The request payload is invalid.",
            details: { issues: error.issues },
          },
        };
      }
      set.status = 500;
      return {
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
          details: {},
        },
      };
    })
    .use(
      createSpanIngestionRoutes({
        authenticate: async () => access,
        publisher,
        admission,
        now: () => new Date("2026-06-22T12:00:02.000Z"),
      }),
    );

  return { app, messages };
}

function request(path: string, body: unknown, method = "POST"): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: {
      authorization: "Bearer as_dev_valid",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("span ingestion routes", () => {
  test("accepts a child before its parent and publishes the relationship", async () => {
    const { app, messages } = createTestContext();
    const response = await app.handle(
      request("/v1/traces/trace_001/spans", spanEvent()),
    );

    expect(response.status).toBe(202);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.event.payload).toMatchObject({
      spanId: "span_child",
      traceId: "trace_001",
      parentSpanId: "span_parent_not_ingested_yet",
    });
  });

  test("applies response capture and configured redaction before queueing", async () => {
    const { app, messages } = createTestContext();
    await app.handle(request("/v1/traces/trace_001/spans", spanEvent()));
    const queued = messages[0]?.event;
    if (queued?.type !== "span.create") {
      throw new Error("Expected a queued span create event.");
    }

    expect(queued.payload.output).toBeUndefined();
    expect(queued.payload.input).toEqual({
      password: "[REDACTED]",
      prompt: "hello",
    });
  });

  test("rejects trace and span path mismatches", async () => {
    const { app, messages } = createTestContext();
    const createResponse = await app.handle(
      request("/v1/traces/another-trace/spans", spanEvent()),
    );
    const updateResponse = await app.handle(
      request(
        "/v1/spans/another-span",
        {
          version: "v1",
          eventId: "evt_span_update_001",
          occurredAt: "2026-06-22T12:01:00.000Z",
          type: "span.update",
          payload: {
            spanId: "span_child",
            status: "success",
          },
        },
        "PATCH",
      ),
    );

    expect(createResponse.status).toBe(400);
    expect(updateResponse.status).toBe(400);
    expect(messages).toHaveLength(0);
  });

  test("accepts a partial span update without inferring hierarchy", async () => {
    const { app, messages } = createTestContext();
    const response = await app.handle(
      request(
        "/v1/spans/span_child",
        {
          version: "v1",
          eventId: "evt_span_update_001",
          occurredAt: "2026-06-22T12:01:00.000Z",
          type: "span.update",
          payload: {
            spanId: "span_child",
            status: "success",
            endedAt: "2026-06-22T12:00:02.000Z",
          },
        },
        "PATCH",
      ),
    );

    expect(response.status).toBe(202);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.event.payload).toEqual({
      spanId: "span_child",
      status: "success",
      endedAt: "2026-06-22T12:00:02.000Z",
    });
  });
});
