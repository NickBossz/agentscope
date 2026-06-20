# TASK-013 — Implementar batch, idempotência e rate limiting

**Status:** pending  
**Dependências:** TASK-011, TASK-012

## Objetivo

Reduzir overhead de rede e impedir duplicação ou abuso dos endpoints públicos.

## Escopo

- Implementar `POST /v1/batch`.
- Validar cada evento e definir semântica clara para erros parciais.
- Deduplicar por project ID e event ID.
- Usar Redis para janela rápida e constraint no PostgreSQL como proteção final.
- Adicionar rate limiting por chave/projeto.
- Definir limites de tamanho e quantidade do batch.

## Critérios de aceite

- Reenvio do mesmo evento não cria duplicata.
- Resposta identifica eventos aceitos, duplicados e inválidos.
- Concorrência não rompe idempotência.
- Limites retornam status e código de erro apropriados.
- Redis não é a única fonte de verdade da deduplicação.

## Testes

- Batch misto, duplicação sequencial e concorrente.
- Rate limit, payload grande e chave revogada.
