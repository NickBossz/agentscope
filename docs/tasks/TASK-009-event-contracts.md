# TASK-009 — Definir contratos de eventos e validação

**Status:** done
**Dependências:** TASK-002, TASK-004

## Objetivo

Definir contratos versionados e reutilizáveis para traces, spans e batches.

## Escopo

- Criar schemas para criação e atualização de trace.
- Criar schemas para criação e atualização de span.
- Criar união discriminada dos tipos de evento.
- Modelar mensagens, tokens, modelos, tags, metadata, tool calls e erros.
- Definir limites de tamanho e regras de timestamps.
- Documentar exemplos válidos e erros esperados.

## Critérios de aceite

- API, worker e SDK usam os mesmos contratos.
- Payloads desconhecidos ou malformados retornam erros úteis.
- Campos opcionais distinguem valor ausente de zero.
- IDs externos são validados e suportam idempotência.
- Contratos preservam compatibilidade dentro de `/v1`.

## Testes

- Casos válidos, inválidos, limites e união de eventos.
- Payloads com spans fora de ordem e parent ausente.

## Contrato `/v1`

Os contratos reutilizáveis estão em
`packages/shared/src/ingestion.ts`. API, worker e SDK devem importar schemas e
tipos de `@agentscope/shared`, sem manter cópias locais.

Cada evento possui `version`, `eventId`, `occurredAt`, `type` e `payload`.
Os tipos suportados são `trace.create`, `trace.update`, `span.create` e
`span.update`.

Exemplo de trace:

```json
{
  "version": "v1",
  "eventId": "evt_trace_001",
  "occurredAt": "2026-06-22T12:00:00.000Z",
  "type": "trace.create",
  "payload": {
    "traceId": "trace_001",
    "name": "support-agent",
    "environment": "development",
    "status": "running",
    "startedAt": "2026-06-22T12:00:00.000Z",
    "tags": ["support"],
    "metadata": {
      "channel": "web"
    }
  }
}
```

Exemplo de span que pode chegar antes do parent:

```json
{
  "version": "v1",
  "eventId": "evt_span_002",
  "occurredAt": "2026-06-22T12:00:01.000Z",
  "type": "span.create",
  "payload": {
    "spanId": "span_child",
    "traceId": "trace_001",
    "parentSpanId": "span_parent",
    "name": "call-model",
    "type": "llm",
    "status": "running",
    "startedAt": "2026-06-22T12:00:01.000Z",
    "model": {
      "provider": "openai",
      "name": "example-model"
    },
    "tokens": {
      "input": 120,
      "output": 0
    }
  }
}
```

Os schemas rejeitam propriedades desconhecidas, IDs fora do formato permitido,
datas sem timezone, intervalos temporais incoerentes, valores não
representáveis em JSON, tags duplicadas, batches com `eventId` repetido e
payloads acima dos limites exportados em `ingestionLimits`.
