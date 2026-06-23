import { describe, expect, test } from "bun:test";
import {
  type CreateTraceInput,
  DomainError,
  errorEnvelope,
  type TraceCreateEvent,
} from "@agentscope/shared";
import { Elysia } from "elysia";
import { ZodError } from "zod";
import type { AuthenticatedProjectKey } from "./api-key-auth";
import type { IngestionAdmission } from "./ingestion-admission";
import type {
  IngestionPublisher,
  QueuedIngestionEvent,
} from "./ingestion-queue";
import { createTraceIngestionRoutes } from "./trace-ingestion";

const access: AuthenticatedProjectKey = {
  apiKeyId: "api-key-id",
  projectId: "project-id",
  organizationId: "organization-id",
  environment: "development",
  settings: {
    capturePrompts: false,
    captureResponses: true,
    redactedFields: ["password"],
  },
};

function createEvent(
  overrides: Partial<CreateTraceInput> = {},
): TraceCreateEvent {
  return {
    version: "v1",
    eventId: "evt_trace_001",
    occurredAt: "2026-06-22T12:00:00.000Z",
    type: "trace.create",
    payload: {
      traceId: "trace_001",
      name: "support-agent",
      environment: "development",
      startedAt: "2026-06-22T12:00:00.000Z",
      input: { password: "secret", prompt: "hello" },
      output: { answer: "hi" },
      ...overrides,
    },
  };
}

function createTestContext(options?: {
  authenticatedAccess?: AuthenticatedProjectKey;
  publishError?: Error;
}) {
  const messages: QueuedIngestionEvent[] = [];
  const publisher: IngestionPublisher = {
    async publish(message) {
      if (options?.publishError) {
        throw options.publishError;
      }
      messages.push(message);
      return "1-0";
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
      createTraceIngestionRoutes({
        authenticate: async (rawKey) => {
          if (rawKey !== "as_dev_valid") {
            throw new DomainError(
              "INVALID_API_KEY",
              "The API key is invalid.",
              401,
            );
          }
          return options?.authenticatedAccess ?? access;
        },
        publisher,
        admission,
        now: () => new Date("2026-06-22T12:00:02.000Z"),
      }),
    );

  return { app, messages };
}

function request(
  path: string,
  body: unknown,
  options?: { method?: string; authorization?: string },
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (options?.authorization) {
    headers.set("authorization", options.authorization);
  }
  return new Request(`http://localhost${path}`, {
    method: options?.method ?? "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("trace ingestion routes", () => {
  test("authenticates, redacts and publishes a tenant-scoped trace", async () => {
    const { app, messages } = createTestContext();
    const response = await app.handle(
      request("/v1/traces", createEvent(), {
        authorization: "Bearer as_dev_valid",
      }),
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      data: {
        accepted: true,
        duplicate: false,
        eventId: "evt_trace_001",
        traceId: "trace_001",
        queueId: "1-0",
      },
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]?.organizationId).toBe("organization-id");
    expect(messages[0]?.projectId).toBe("project-id");
    expect(messages[0]?.receivedAt).toBe("2026-06-22T12:00:02.000Z");
    expect(messages[0]?.event.payload.input).toBeUndefined();
    expect(messages[0]?.event.payload.output).toEqual({ answer: "hi" });
  });

  test("rejects missing credentials without publishing", async () => {
    const { app, messages } = createTestContext();
    const response = await app.handle(request("/v1/traces", createEvent()));

    expect(response.status).toBe(401);
    expect(messages).toHaveLength(0);
  });

  test("rejects invalid payloads and environment mismatches", async () => {
    const { app, messages } = createTestContext();
    const invalid = await app.handle(
      request(
        "/v1/traces",
        { hello: "world" },
        {
          authorization: "Bearer as_dev_valid",
        },
      ),
    );
    const wrongEnvironment = await app.handle(
      request("/v1/traces", createEvent({ environment: "production" }), {
        authorization: "Bearer as_dev_valid",
      }),
    );

    expect(invalid.status).toBe(400);
    expect(wrongEnvironment.status).toBe(403);
    expect(messages).toHaveLength(0);
  });

  test("accepts partial updates and enforces the path trace ID", async () => {
    const { app, messages } = createTestContext();
    const update = {
      version: "v1",
      eventId: "evt_trace_update_001",
      occurredAt: "2026-06-22T12:01:00.000Z",
      type: "trace.update",
      payload: {
        traceId: "trace_001",
        status: "success",
        output: { answer: "done" },
      },
    };

    const accepted = await app.handle(
      request("/v1/traces/trace_001", update, {
        method: "PATCH",
        authorization: "Bearer as_dev_valid",
      }),
    );
    const mismatched = await app.handle(
      request("/v1/traces/another-trace", update, {
        method: "PATCH",
        authorization: "Bearer as_dev_valid",
      }),
    );

    expect(accepted.status).toBe(202);
    expect(mismatched.status).toBe(400);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.event.payload).toEqual({
      traceId: "trace_001",
      status: "success",
      output: { answer: "done" },
    });
  });

  test("returns a safe error when the queue is unavailable", async () => {
    const { app } = createTestContext({
      publishError: new Error("redis://user:password@internal:6379 failed"),
    });
    const response = await app.handle(
      request("/v1/traces", createEvent(), {
        authorization: "Bearer as_dev_valid",
      }),
    );
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).not.toContain("password@internal");
    expect(body).toContain("INGESTION_QUEUE_UNAVAILABLE");
  });
});
