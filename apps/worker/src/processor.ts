import type { Database } from "@agentscope/database";
import {
  ingestionEvents,
  modelPrices,
  spans,
  toolCalls,
  traceErrors,
  traces,
} from "@agentscope/database";
import {
  calculateEstimatedCost,
  type IngestionError,
  type IngestionEvent,
  type QueuedIngestionEvent,
  type ToolCall,
} from "@agentscope/shared";
import { and, desc, eq, gt, isNull, lte, or, sql } from "drizzle-orm";

export class RetryableProcessingError extends Error {}
type Transaction = Parameters<Parameters<Database["db"]["transaction"]>[0]>[0];

interface PriceVersion {
  id: string;
  inputPricePerMillion: string | null;
  outputPricePerMillion: string | null;
  cachedInputPricePerMillion: string | null;
}

async function findPrice(
  database: Transaction,
  provider: string | undefined,
  model: string | undefined,
  occurredAt: Date,
): Promise<PriceVersion | null> {
  if (!provider || !model) {
    return null;
  }
  const [price] = await database
    .select({
      id: modelPrices.id,
      inputPricePerMillion: modelPrices.inputPricePerMillion,
      outputPricePerMillion: modelPrices.outputPricePerMillion,
      cachedInputPricePerMillion: modelPrices.cachedInputPricePerMillion,
    })
    .from(modelPrices)
    .where(
      and(
        eq(modelPrices.provider, provider),
        eq(modelPrices.model, model),
        lte(modelPrices.effectiveFrom, occurredAt),
        or(
          isNull(modelPrices.effectiveTo),
          gt(modelPrices.effectiveTo, occurredAt),
        ),
      ),
    )
    .orderBy(desc(modelPrices.effectiveFrom))
    .limit(1);
  return price ?? null;
}

function duration(
  startedAt: string | undefined,
  endedAt: string | undefined,
  supplied: number | undefined,
): number | undefined {
  if (supplied !== undefined) {
    return supplied;
  }
  if (startedAt && endedAt) {
    return Date.parse(endedAt) - Date.parse(startedAt);
  }
  return undefined;
}

async function costFields(
  database: Transaction,
  event: IngestionEvent,
): Promise<{ estimatedCost: string | null; modelPriceId: string | null }> {
  const payload = event.payload;
  const price = await findPrice(
    database,
    payload.model?.provider,
    payload.model?.name,
    new Date(event.occurredAt),
  );
  if (!payload.tokens) {
    return { estimatedCost: null, modelPriceId: price?.id ?? null };
  }
  if (!price) {
    return { estimatedCost: null, modelPriceId: null };
  }
  return {
    estimatedCost: calculateEstimatedCost({
      inputTokens: payload.tokens.input,
      outputTokens: payload.tokens.output,
      cachedTokens: payload.tokens.cached,
      inputPricePerMillion: price.inputPricePerMillion,
      outputPricePerMillion: price.outputPricePerMillion,
      cachedInputPricePerMillion: price.cachedInputPricePerMillion,
    }),
    modelPriceId: price.id,
  };
}

function tokenFields(tokens: IngestionEvent["payload"]["tokens"]) {
  return {
    ...(tokens?.input !== undefined ? { inputTokens: tokens.input } : {}),
    ...(tokens?.output !== undefined ? { outputTokens: tokens.output } : {}),
    ...(tokens?.cached !== undefined ? { cachedTokens: tokens.cached } : {}),
    ...(tokens?.reasoning !== undefined
      ? { reasoningTokens: tokens.reasoning }
      : {}),
    ...(tokens?.total !== undefined ? { totalTokens: tokens.total } : {}),
  };
}

function modelFields(model: IngestionEvent["payload"]["model"]) {
  return {
    ...(model?.name !== undefined ? { model: model.name } : {}),
    ...(model?.provider !== undefined ? { provider: model.provider } : {}),
    ...(model?.parameters !== undefined
      ? {
          modelParameters: model.parameters as Record<string, unknown>,
        }
      : {}),
  };
}

async function persistErrors(
  transaction: Transaction,
  message: QueuedIngestionEvent,
  traceId: string,
  spanId: string | null,
  errors: IngestionError[] | undefined,
): Promise<void> {
  if (!errors) {
    return;
  }
  if (spanId) {
    await transaction
      .delete(traceErrors)
      .where(
        and(
          eq(traceErrors.projectId, message.projectId),
          eq(traceErrors.spanId, spanId),
        ),
      );
  }
  if (errors.length > 0) {
    await transaction.insert(traceErrors).values(
      errors.map((error) => ({
        organizationId: message.organizationId,
        projectId: message.projectId,
        traceId,
        spanId,
        category: error.category,
        errorType: error.type,
        message: error.message,
        stackTrace: error.stackTrace,
        provider: error.provider,
        toolName: error.toolName,
        retryNumber: error.retryNumber,
        occurredAt: new Date(error.occurredAt),
      })),
    );
  }
}

async function persistTools(
  transaction: Transaction,
  message: QueuedIngestionEvent,
  traceId: string,
  spanId: string,
  tools: ToolCall[] | undefined,
): Promise<void> {
  if (!tools) {
    return;
  }
  await transaction
    .delete(toolCalls)
    .where(
      and(
        eq(toolCalls.projectId, message.projectId),
        eq(toolCalls.spanId, spanId),
      ),
    );
  if (tools.length > 0) {
    await transaction.insert(toolCalls).values(
      tools.map((tool) => ({
        organizationId: message.organizationId,
        projectId: message.projectId,
        traceId,
        spanId,
        name: tool.name,
        arguments: tool.arguments,
        result: tool.result,
        durationMs: duration(tool.startedAt, tool.endedAt, tool.durationMs),
        status: tool.status,
        retryCount: tool.retryCount,
      })),
    );
  }
}

async function traceInternalId(
  database: Transaction,
  projectId: string,
  externalId: string,
): Promise<string> {
  const [trace] = await database
    .select({ id: traces.id })
    .from(traces)
    .where(
      and(eq(traces.projectId, projectId), eq(traces.externalId, externalId)),
    )
    .limit(1);
  if (!trace) {
    throw new RetryableProcessingError("Trace has not been persisted yet.");
  }
  return trace.id;
}

async function processTraceCreate(
  transaction: Transaction,
  message: QueuedIngestionEvent,
): Promise<void> {
  if (message.event.type !== "trace.create") {
    return;
  }
  const payload = message.event.payload;
  const costs = await costFields(transaction, message.event);
  const [trace] = await transaction
    .insert(traces)
    .values({
      externalId: payload.traceId,
      eventId: message.event.eventId,
      organizationId: message.organizationId,
      projectId: message.projectId,
      name: payload.name,
      environment: payload.environment,
      status: payload.status ?? "pending",
      startedAt: new Date(payload.startedAt),
      endedAt: payload.endedAt ? new Date(payload.endedAt) : null,
      durationMs: duration(
        payload.startedAt,
        payload.endedAt,
        payload.durationMs,
      ),
      input: payload.input,
      output: payload.output,
      messages: payload.messages as unknown[] | undefined,
      userExternalId: payload.userId,
      sessionExternalId: payload.sessionId,
      ...modelFields(payload.model),
      ...tokenFields(payload.tokens),
      estimatedCost: costs.estimatedCost,
      modelPriceId: costs.modelPriceId,
      tags: payload.tags ?? [],
      metadata: payload.metadata ?? {},
      applicationVersion: payload.applicationVersion,
      agentVersion: payload.agentVersion,
      promptVersion: payload.promptVersion,
    })
    .onConflictDoUpdate({
      target: [traces.projectId, traces.externalId],
      set: {
        name: payload.name,
        status: payload.status ?? "pending",
        updatedAt: new Date(),
      },
    })
    .returning({ id: traces.id });
  if (!trace) {
    throw new Error("Trace persistence did not return a row.");
  }
  await persistErrors(transaction, message, trace.id, null, payload.errors);
}

async function processTraceUpdate(
  transaction: Transaction,
  message: QueuedIngestionEvent,
): Promise<void> {
  if (message.event.type !== "trace.update") {
    return;
  }
  const payload = message.event.payload;
  const costs = await costFields(transaction, message.event);
  const [existing] = await transaction
    .select({ startedAt: traces.startedAt })
    .from(traces)
    .where(
      and(
        eq(traces.projectId, message.projectId),
        eq(traces.externalId, payload.traceId),
      ),
    )
    .limit(1);
  if (!existing) {
    throw new RetryableProcessingError("Trace update arrived before create.");
  }
  const effectiveStartedAt =
    payload.startedAt ?? existing.startedAt.toISOString();
  const [trace] = await transaction
    .update(traces)
    .set({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.startedAt !== undefined
        ? { startedAt: new Date(payload.startedAt) }
        : {}),
      ...(payload.endedAt !== undefined
        ? { endedAt: new Date(payload.endedAt) }
        : {}),
      ...(payload.input !== undefined ? { input: payload.input } : {}),
      ...(payload.output !== undefined ? { output: payload.output } : {}),
      ...(payload.messages !== undefined
        ? { messages: payload.messages as unknown[] }
        : {}),
      ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
      ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
      ...modelFields(payload.model),
      ...tokenFields(payload.tokens),
      ...(costs.estimatedCost !== null
        ? { estimatedCost: costs.estimatedCost }
        : {}),
      ...(costs.modelPriceId !== null
        ? { modelPriceId: costs.modelPriceId }
        : {}),
      durationMs: duration(
        effectiveStartedAt,
        payload.endedAt,
        payload.durationMs,
      ),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(traces.projectId, message.projectId),
        eq(traces.externalId, payload.traceId),
      ),
    )
    .returning({ id: traces.id });
  if (!trace) {
    throw new Error("Trace update did not return a row.");
  }
  await persistErrors(transaction, message, trace.id, null, payload.errors);
}

async function processSpanCreate(
  transaction: Transaction,
  message: QueuedIngestionEvent,
): Promise<void> {
  if (message.event.type !== "span.create") {
    return;
  }
  const payload = message.event.payload;
  const traceId = await traceInternalId(
    transaction,
    message.projectId,
    payload.traceId,
  );
  const costs = await costFields(transaction, message.event);
  const [span] = await transaction
    .insert(spans)
    .values({
      externalId: payload.spanId,
      eventId: message.event.eventId,
      traceId,
      organizationId: message.organizationId,
      projectId: message.projectId,
      parentSpanExternalId: payload.parentSpanId,
      name: payload.name,
      type: payload.type,
      status: payload.status ?? "pending",
      startedAt: new Date(payload.startedAt),
      endedAt: payload.endedAt ? new Date(payload.endedAt) : null,
      durationMs: duration(
        payload.startedAt,
        payload.endedAt,
        payload.durationMs,
      ),
      input: payload.input,
      output: payload.output,
      messages: payload.messages as unknown[] | undefined,
      ...modelFields(payload.model),
      ...tokenFields(payload.tokens),
      estimatedCost: costs.estimatedCost,
      modelPriceId: costs.modelPriceId,
      tags: payload.tags ?? [],
      metadata: payload.metadata ?? {},
    })
    .onConflictDoUpdate({
      target: [spans.projectId, spans.externalId],
      set: {
        name: payload.name,
        status: payload.status ?? "pending",
        updatedAt: new Date(),
      },
    })
    .returning({ id: spans.id });
  if (!span) {
    throw new Error("Span persistence did not return a row.");
  }
  await persistTools(transaction, message, traceId, span.id, payload.toolCalls);
  await persistErrors(transaction, message, traceId, span.id, payload.errors);
}

async function processSpanUpdate(
  transaction: Transaction,
  message: QueuedIngestionEvent,
): Promise<void> {
  if (message.event.type !== "span.update") {
    return;
  }
  const payload = message.event.payload;
  const costs = await costFields(transaction, message.event);
  const [existing] = await transaction
    .select({ startedAt: spans.startedAt })
    .from(spans)
    .where(
      and(
        eq(spans.projectId, message.projectId),
        eq(spans.externalId, payload.spanId),
      ),
    )
    .limit(1);
  if (!existing) {
    throw new RetryableProcessingError("Span update arrived before create.");
  }
  const effectiveStartedAt =
    payload.startedAt ?? existing.startedAt.toISOString();
  const [span] = await transaction
    .update(spans)
    .set({
      ...(payload.parentSpanId !== undefined
        ? { parentSpanExternalId: payload.parentSpanId }
        : {}),
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.type !== undefined ? { type: payload.type } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.startedAt !== undefined
        ? { startedAt: new Date(payload.startedAt) }
        : {}),
      ...(payload.endedAt !== undefined
        ? { endedAt: new Date(payload.endedAt) }
        : {}),
      ...(payload.input !== undefined ? { input: payload.input } : {}),
      ...(payload.output !== undefined ? { output: payload.output } : {}),
      ...(payload.messages !== undefined
        ? { messages: payload.messages as unknown[] }
        : {}),
      ...(payload.tags !== undefined ? { tags: payload.tags } : {}),
      ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
      ...modelFields(payload.model),
      ...tokenFields(payload.tokens),
      ...(costs.estimatedCost !== null
        ? { estimatedCost: costs.estimatedCost }
        : {}),
      ...(costs.modelPriceId !== null
        ? { modelPriceId: costs.modelPriceId }
        : {}),
      durationMs: duration(
        effectiveStartedAt,
        payload.endedAt,
        payload.durationMs,
      ),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(spans.projectId, message.projectId),
        eq(spans.externalId, payload.spanId),
      ),
    )
    .returning({ id: spans.id, traceId: spans.traceId });
  if (!span) {
    throw new Error("Span update did not return a row.");
  }
  await persistTools(
    transaction,
    message,
    span.traceId,
    span.id,
    payload.toolCalls,
  );
  await persistErrors(
    transaction,
    message,
    span.traceId,
    span.id,
    payload.errors,
  );
}

async function refreshTraceSummary(
  transaction: Transaction,
  message: QueuedIngestionEvent,
): Promise<void> {
  const externalTraceId =
    message.event.type === "trace.create" ||
    message.event.type === "trace.update" ||
    message.event.type === "span.create"
      ? message.event.payload.traceId
      : message.event.type === "span.update"
        ? message.event.payload.traceId
        : undefined;
  let resolvedExternalTraceId = externalTraceId;
  if (!resolvedExternalTraceId && message.event.type === "span.update") {
    const [span] = await transaction
      .select({ traceExternalId: traces.externalId })
      .from(spans)
      .innerJoin(traces, eq(traces.id, spans.traceId))
      .where(
        and(
          eq(spans.projectId, message.projectId),
          eq(spans.externalId, message.event.payload.spanId),
        ),
      )
      .limit(1);
    resolvedExternalTraceId = span?.traceExternalId;
  }
  if (!resolvedExternalTraceId) {
    return;
  }
  const traceId = await traceInternalId(
    transaction,
    message.projectId,
    resolvedExternalTraceId,
  );
  const [summary] = await transaction
    .select({
      spanCount: sql<number>`count(*)`,
      inputTokens: sql<number | null>`sum(${spans.inputTokens})`,
      outputTokens: sql<number | null>`sum(${spans.outputTokens})`,
      cachedTokens: sql<number | null>`sum(${spans.cachedTokens})`,
      reasoningTokens: sql<number | null>`sum(${spans.reasoningTokens})`,
      totalTokens: sql<number | null>`sum(${spans.totalTokens})`,
      estimatedCost: sql<string | null>`sum(${spans.estimatedCost})`,
      hasUnknownCost: sql<boolean>`bool_or(${spans.totalTokens} is not null and ${spans.estimatedCost} is null)`,
      hasError: sql<boolean>`bool_or(${spans.status} = 'error')`,
      hasRunning: sql<boolean>`bool_or(${spans.status} in ('pending', 'running'))`,
    })
    .from(spans)
    .where(eq(spans.traceId, traceId));
  if (!summary) {
    return;
  }
  if (Number(summary.spanCount) === 0) {
    return;
  }
  await transaction
    .update(traces)
    .set({
      inputTokens: summary.inputTokens,
      outputTokens: summary.outputTokens,
      cachedTokens: summary.cachedTokens,
      reasoningTokens: summary.reasoningTokens,
      totalTokens: summary.totalTokens,
      estimatedCost: summary.hasUnknownCost ? null : summary.estimatedCost,
      ...(summary.hasError
        ? { status: "error" as const }
        : summary.hasRunning
          ? { status: "running" as const }
          : {}),
      updatedAt: new Date(),
    })
    .where(eq(traces.id, traceId));
}

export async function processIngestionMessage(
  database: Database["db"],
  message: QueuedIngestionEvent,
): Promise<void> {
  await database.transaction(async (transaction) => {
    const [record] = await transaction
      .select({ status: ingestionEvents.status })
      .from(ingestionEvents)
      .where(
        and(
          eq(ingestionEvents.projectId, message.projectId),
          eq(ingestionEvents.eventId, message.event.eventId),
        ),
      )
      .limit(1);
    if (!record) {
      throw new Error("The ingestion reservation was not found.");
    }
    if (record.status === "processed") {
      return;
    }

    await processTraceCreate(transaction, message);
    await processTraceUpdate(transaction, message);
    await processSpanCreate(transaction, message);
    await processSpanUpdate(transaction, message);
    await refreshTraceSummary(transaction, message);

    await transaction
      .update(ingestionEvents)
      .set({
        status: "processed",
        attempts: message.attempt,
        processedAt: new Date(),
        lastErrorCode: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ingestionEvents.projectId, message.projectId),
          eq(ingestionEvents.eventId, message.event.eventId),
        ),
      );
  });
}
