# TASK-012 — Implementar ingestão de spans

**Status:** done
**Dependências:** TASK-011

## Objetivo

Permitir adicionar e atualizar spans aninhados em um trace.

## Escopo

- Implementar `POST /v1/traces/:traceId/spans`.
- Implementar `PATCH /v1/spans/:spanId`.
- Suportar todos os tipos de span do PRD.
- Aceitar parent ausente ou ainda não processado.
- Preservar relações por `spanId`, `traceId` e `parentSpanId`.

## Critérios de aceite

- Spans chegam fora de ordem sem perda de dados.
- API não infere hierarquia pela ordem do array.
- Trace e span são limitados ao projeto autenticado.
- Erros, tokens, modelos, input/output e metadata são validados.
- Updates repetidos são seguros.

## Testes

- Span raiz, aninhado, órfão temporário e update.
- Tentativas de associar span a trace de outro projeto.

## Implementação

Endpoints:

```text
POST  /v1/traces/:traceId/spans
PATCH /v1/spans/:spanId
```

Os endpoints usam os eventos `span.create` e `span.update` compartilhados. O
`traceId` ou `spanId` do path deve coincidir com o payload.

Parents não são consultados durante a ingestão. `parentSpanId` é preservado
como identificador externo, permitindo que filhos e spans temporariamente
órfãos cheguem antes do parent. A hierarquia nunca é inferida pela ordem de
recebimento.

Organização e projeto são derivados exclusivamente da API key e anexados ao
evento seguro antes da publicação no Redis Stream.
