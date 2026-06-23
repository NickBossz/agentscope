# TASK-013 — Implementar batch, idempotência e rate limiting

**Status:** done
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

## Implementação

- `POST /v1/batch` retorna resultados `accepted`, `duplicate` e `invalid` por
  evento;
- o limite é de 100 eventos por batch;
- o rate limit é de 120 eventos por projeto/API key a cada 60 segundos;
- `(projectId, eventId)` possui reserva única no PostgreSQL;
- Redis é usado para transporte e janela de rate limit, mas não é a fonte final
  de idempotência;
- falha de publicação libera uma reserva ainda não enfileirada;
- concorrência para o mesmo evento produz uma única reserva e uma única
  mensagem.
