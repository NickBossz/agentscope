# TASK-012 — Implementar ingestão de spans

**Status:** pending  
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
