# TASK-011 — Implementar ingestão de traces

**Status:** done
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

## Implementação

Endpoints:

```text
POST  /v1/traces
PATCH /v1/traces/:traceId
```

Ambos recebem eventos versionados da TASK-009 e exigem:

```http
Authorization: Bearer <project-api-key>
```

O fluxo executado antes da resposta é:

```text
autenticar API key
  -> obter organização, projeto, ambiente e configurações
  -> validar evento
  -> verificar ambiente ou trace ID
  -> aplicar privacidade e redação
  -> publicar no Redis Stream
  -> responder 202
```

O contexto de organização e projeto nunca é aceito do payload. Ele é anexado à
mensagem da fila exclusivamente a partir da API key autenticada.

Respostas de sucesso incluem `eventId`, `traceId` e o ID retornado pelo Redis
Stream. Falhas de publicação retornam
`INGESTION_QUEUE_UNAVAILABLE` sem detalhes internos ou credenciais.

O stream usado é `agentscope:ingestion`. O processamento e confirmação das
mensagens serão implementados na TASK-014.
