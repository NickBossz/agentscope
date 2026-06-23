# TASK-014 — Implementar filas e worker

**Status:** done
**Dependências:** TASK-003, TASK-004, TASK-013

## Objetivo

Processar eventos aceitos de forma assíncrona, idempotente e recuperável.

## Escopo

- Implementar fila ou stream Redis e consumidor no `apps/worker`.
- Persistir traces, spans e eventos derivados.
- Configurar retries limitados e backoff.
- Criar mecanismo de dead letter.
- Propagar contexto e usar logs estruturados seguros.
- Garantir shutdown gracioso.

## Critérios de aceite

- Evento aceito é persistido mesmo após retry transitório.
- Reprocessamento não duplica registros nem agregações.
- Falhas permanentes chegam ao dead letter com metadata segura.
- Worker pode escalar horizontalmente.
- Reinício não perde eventos confirmados.

## Testes

- Processamento feliz, retry, poison message, concorrência e restart.
- Testar idempotência entre fila e banco.

## Implementação

O worker consome o Redis Stream `agentscope:ingestion` pelo consumer group
`agentscope-workers`.

- mensagens são processadas em transação;
- eventos já processados são ignorados com segurança;
- falhas são reenfileiradas até três tentativas;
- falhas permanentes vão para `agentscope:ingestion:dead-letter`;
- mensagens abandonadas são recuperadas com `XAUTOCLAIM`;
- a confirmação `XACK` ocorre somente após persistência ou encaminhamento para
  retry/dead letter;
- shutdown fecha Redis e PostgreSQL de forma graciosa.
