# TASK-009 — Definir contratos de eventos e validação

**Status:** pending  
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
