import { z } from "zod";
import {
  environments,
  errorCategories,
  spanTypes,
  traceStatuses,
} from "./types";

export const ingestionLimits = {
  batchEvents: 100,
  eventIdLength: 128,
  externalIdLength: 128,
  nameLength: 240,
  tagCount: 50,
  tagLength: 120,
  metadataBytes: 64 * 1024,
  contentBytes: 256 * 1024,
  toolPayloadBytes: 128 * 1024,
  errorMessageLength: 8_000,
  stackTraceLength: 32_000,
} as const;

const utf8Encoder = new TextEncoder();
const externalIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

function jsonSize(value: unknown): number {
  return utf8Encoder.encode(JSON.stringify(value)).byteLength;
}

function boundedJson<TSchema extends z.ZodType>(
  schema: TSchema,
  maximumBytes: number,
  label: string,
): TSchema {
  return schema.superRefine((value, context) => {
    if (jsonSize(value) > maximumBytes) {
      context.addIssue({
        code: "custom",
        message: `${label} must not exceed ${maximumBytes} bytes when encoded as JSON.`,
      });
    }
  }) as TSchema;
}

export const jsonPrimitiveSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    jsonPrimitiveSchema,
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const eventIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(ingestionLimits.eventIdLength)
  .regex(externalIdPattern);

export const externalIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(ingestionLimits.externalIdLength)
  .regex(externalIdPattern);

export const ingestionTimestampSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => value.endsWith("Z"), {
    message: "Timestamp must be expressed in UTC with a Z suffix.",
  });

export const durationMsSchema = z.number().int().nonnegative().safe();
export const tokenCountSchema = z.number().int().nonnegative().safe();
export const traceStatusSchema = z.enum(traceStatuses);
export const spanTypeSchema = z.enum(spanTypes);
export const environmentSchema = z.enum(environments);
export const errorCategorySchema = z.enum(errorCategories);

export const tagsSchema = z
  .array(z.string().trim().min(1).max(ingestionLimits.tagLength))
  .max(ingestionLimits.tagCount)
  .refine((tags) => new Set(tags).size === tags.length, {
    message: "Tags must be unique.",
  });

export const metadataSchema = boundedJson(
  z.record(z.string().min(1).max(200), jsonValueSchema),
  ingestionLimits.metadataBytes,
  "Metadata",
);

export const contentSchema = boundedJson(
  jsonValueSchema,
  ingestionLimits.contentBytes,
  "Content",
);

export const messageRoleSchema = z.enum([
  "system",
  "developer",
  "user",
  "assistant",
  "tool",
]);

export const messageSchema = z
  .object({
    role: messageRoleSchema,
    content: contentSchema,
    name: z.string().trim().min(1).max(120).optional(),
    toolCallId: externalIdSchema.optional(),
  })
  .strict();

export const tokenUsageSchema = z
  .object({
    input: tokenCountSchema.optional(),
    output: tokenCountSchema.optional(),
    cached: tokenCountSchema.optional(),
    reasoning: tokenCountSchema.optional(),
    total: tokenCountSchema.optional(),
  })
  .strict()
  .superRefine((usage, context) => {
    const knownTotal = (usage.input ?? 0) + (usage.output ?? 0);

    if (usage.total !== undefined && usage.total < knownTotal) {
      context.addIssue({
        code: "custom",
        path: ["total"],
        message: "Total tokens cannot be lower than the sum of known tokens.",
      });
    }
  });

export const modelSchema = z
  .object({
    provider: z.string().trim().min(1).max(120),
    name: z.string().trim().min(1).max(240),
    parameters: metadataSchema.optional(),
  })
  .strict();

type TemporalRange = {
  startedAt?: string | undefined;
  endedAt?: string | undefined;
  durationMs?: number | undefined;
};

function validateTemporalRange(
  value: TemporalRange,
  context: z.RefinementCtx,
): void {
  if (
    value.startedAt !== undefined &&
    value.endedAt !== undefined &&
    Date.parse(value.endedAt) < Date.parse(value.startedAt)
  ) {
    context.addIssue({
      code: "custom",
      path: ["endedAt"],
      message: "End timestamp cannot be earlier than start timestamp.",
    });
  }

  if (
    value.startedAt !== undefined &&
    value.endedAt !== undefined &&
    value.durationMs !== undefined
  ) {
    const elapsed = Date.parse(value.endedAt) - Date.parse(value.startedAt);
    if (elapsed !== value.durationMs) {
      context.addIssue({
        code: "custom",
        path: ["durationMs"],
        message: "Duration must match the supplied start and end timestamps.",
      });
    }
  }
}

export const toolCallSchema = z
  .object({
    id: externalIdSchema.optional(),
    name: z.string().trim().min(1).max(240),
    arguments: boundedJson(
      jsonValueSchema,
      ingestionLimits.toolPayloadBytes,
      "Tool arguments",
    ).optional(),
    result: boundedJson(
      jsonValueSchema,
      ingestionLimits.toolPayloadBytes,
      "Tool result",
    ).optional(),
    startedAt: ingestionTimestampSchema.optional(),
    endedAt: ingestionTimestampSchema.optional(),
    durationMs: durationMsSchema.optional(),
    status: traceStatusSchema,
    retryCount: z.number().int().nonnegative().max(1_000).default(0),
  })
  .strict()
  .superRefine(validateTemporalRange);

export const ingestionErrorSchema = z
  .object({
    category: errorCategorySchema,
    type: z.string().trim().min(1).max(240).optional(),
    message: z.string().min(1).max(ingestionLimits.errorMessageLength),
    stackTrace: z.string().max(ingestionLimits.stackTraceLength).optional(),
    provider: z.string().trim().min(1).max(120).optional(),
    toolName: z.string().trim().min(1).max(240).optional(),
    retryNumber: z.number().int().nonnegative().max(1_000).default(0),
    occurredAt: ingestionTimestampSchema,
  })
  .strict();

const traceFieldsSchema = z.object({
  status: traceStatusSchema.optional(),
  endedAt: ingestionTimestampSchema.optional(),
  durationMs: durationMsSchema.optional(),
  input: contentSchema.optional(),
  output: contentSchema.optional(),
  messages: z.array(messageSchema).max(1_000).optional(),
  userId: z.string().trim().min(1).max(240).optional(),
  sessionId: z.string().trim().min(1).max(240).optional(),
  model: modelSchema.optional(),
  tokens: tokenUsageSchema.optional(),
  tags: tagsSchema.optional(),
  metadata: metadataSchema.optional(),
  applicationVersion: z.string().trim().min(1).max(120).optional(),
  agentVersion: z.string().trim().min(1).max(120).optional(),
  promptVersion: z.string().trim().min(1).max(120).optional(),
  errors: z.array(ingestionErrorSchema).max(100).optional(),
});

export const createTraceSchema = traceFieldsSchema
  .extend({
    traceId: externalIdSchema,
    name: z.string().trim().min(1).max(ingestionLimits.nameLength),
    environment: environmentSchema,
    startedAt: ingestionTimestampSchema,
  })
  .strict()
  .superRefine(validateTemporalRange);

export const updateTraceSchema = traceFieldsSchema
  .extend({
    traceId: externalIdSchema,
    startedAt: ingestionTimestampSchema.optional(),
    name: z.string().trim().min(1).max(ingestionLimits.nameLength).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).every((key) => key === "traceId")) {
      context.addIssue({
        code: "custom",
        message: "At least one trace field must be supplied for an update.",
      });
    }
    validateTemporalRange(value, context);
  });

const spanFieldsSchema = z.object({
  parentSpanId: externalIdSchema.nullable().optional(),
  status: traceStatusSchema.optional(),
  startedAt: ingestionTimestampSchema.optional(),
  endedAt: ingestionTimestampSchema.optional(),
  durationMs: durationMsSchema.optional(),
  input: contentSchema.optional(),
  output: contentSchema.optional(),
  messages: z.array(messageSchema).max(1_000).optional(),
  model: modelSchema.optional(),
  tokens: tokenUsageSchema.optional(),
  tags: tagsSchema.optional(),
  metadata: metadataSchema.optional(),
  toolCalls: z.array(toolCallSchema).max(100).optional(),
  errors: z.array(ingestionErrorSchema).max(100).optional(),
});

export const createSpanSchema = spanFieldsSchema
  .extend({
    spanId: externalIdSchema,
    traceId: externalIdSchema,
    name: z.string().trim().min(1).max(ingestionLimits.nameLength),
    type: spanTypeSchema,
    startedAt: ingestionTimestampSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.parentSpanId === value.spanId) {
      context.addIssue({
        code: "custom",
        path: ["parentSpanId"],
        message: "A span cannot be its own parent.",
      });
    }
    validateTemporalRange(value, context);
  });

export const updateSpanSchema = spanFieldsSchema
  .extend({
    spanId: externalIdSchema,
    traceId: externalIdSchema.optional(),
    name: z.string().trim().min(1).max(ingestionLimits.nameLength).optional(),
    type: spanTypeSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Object.keys(value).every((key) => key === "spanId")) {
      context.addIssue({
        code: "custom",
        message: "At least one span field must be supplied for an update.",
      });
    }
    if (value.parentSpanId === value.spanId) {
      context.addIssue({
        code: "custom",
        path: ["parentSpanId"],
        message: "A span cannot be its own parent.",
      });
    }
    validateTemporalRange(value, context);
  });

const eventEnvelopeFields = {
  version: z.literal("v1"),
  eventId: eventIdSchema,
  occurredAt: ingestionTimestampSchema,
};

export const traceCreateEventSchema = z
  .object({
    ...eventEnvelopeFields,
    type: z.literal("trace.create"),
    payload: createTraceSchema,
  })
  .strict();

export const traceUpdateEventSchema = z
  .object({
    ...eventEnvelopeFields,
    type: z.literal("trace.update"),
    payload: updateTraceSchema,
  })
  .strict();

export const spanCreateEventSchema = z
  .object({
    ...eventEnvelopeFields,
    type: z.literal("span.create"),
    payload: createSpanSchema,
  })
  .strict();

export const spanUpdateEventSchema = z
  .object({
    ...eventEnvelopeFields,
    type: z.literal("span.update"),
    payload: updateSpanSchema,
  })
  .strict();

export const ingestionEventSchema = z.discriminatedUnion("type", [
  traceCreateEventSchema,
  traceUpdateEventSchema,
  spanCreateEventSchema,
  spanUpdateEventSchema,
]);

export const ingestionBatchSchema = z
  .object({
    version: z.literal("v1"),
    events: z
      .array(ingestionEventSchema)
      .min(1)
      .max(ingestionLimits.batchEvents),
  })
  .strict()
  .superRefine((batch, context) => {
    const seen = new Set<string>();
    for (const [index, event] of batch.events.entries()) {
      if (seen.has(event.eventId)) {
        context.addIssue({
          code: "custom",
          path: ["events", index, "eventId"],
          message: "Event IDs must be unique within a batch.",
        });
      }
      seen.add(event.eventId);
    }
  });

export type Message = z.infer<typeof messageSchema>;
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
export type Model = z.infer<typeof modelSchema>;
export type ToolCall = z.infer<typeof toolCallSchema>;
export type IngestionError = z.infer<typeof ingestionErrorSchema>;
export type CreateTraceInput = z.infer<typeof createTraceSchema>;
export type UpdateTraceInput = z.infer<typeof updateTraceSchema>;
export type CreateSpanInput = z.infer<typeof createSpanSchema>;
export type UpdateSpanInput = z.infer<typeof updateSpanSchema>;
export type TraceCreateEvent = z.infer<typeof traceCreateEventSchema>;
export type TraceUpdateEvent = z.infer<typeof traceUpdateEventSchema>;
export type SpanCreateEvent = z.infer<typeof spanCreateEventSchema>;
export type SpanUpdateEvent = z.infer<typeof spanUpdateEventSchema>;
export type IngestionEvent = z.infer<typeof ingestionEventSchema>;
export type IngestionBatch = z.infer<typeof ingestionBatchSchema>;
