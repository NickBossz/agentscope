# TASK-011 — Implementar ingestão de traces

**Status:** pending  
**Dependências:** TASK-008, TASK-009, TASK-010

## Objetivo

Criar endpoints rápidos e autenticados para abrir e atualizar traces.

## Escopo

- Implementar `POST /v1/traces`.
- Implementar `PATCH /v1/traces/:traceId`.
- Autenticar por API key de projeto.
- Validar, redigir, verificar projeto/ambiente e publicar evento.
- Retornar resposta antes do processamento caro.
- Padronizar códigos e envelopes de erro.

## Critérios de aceite

- Trace válido é aceito e associado apenas ao projeto da chave.
- Payload inválido não é enfileirado.
- Atualizações preservam campos não enviados.
- Endpoint não calcula analytics ou custos sincronamente.
- P95 alvo de 150 ms é mensurável em carga de desenvolvimento.

## Testes

- Autenticação, validação, projeto incorreto e publicação na fila.
- Teste de integração do fluxo create/update.
