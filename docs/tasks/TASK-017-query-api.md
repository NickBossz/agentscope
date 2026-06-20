# TASK-017 — Implementar APIs de consulta

**Status:** pending  
**Dependências:** TASK-006, TASK-016

## Objetivo

Expor dados de traces e analytics para o dashboard com autorização e paginação.

## Escopo

- Implementar `GET /v1/projects/:projectId/traces`.
- Implementar `GET /v1/traces/:traceId`.
- Adicionar paginação estável e ordenação.
- Implementar filtros definidos no PRD.
- Retornar árvore/timeline, tools, erros e avaliações no detalhe.
- Criar endpoints agregados necessários ao dashboard.

## Critérios de aceite

- Todos os endpoints exigem sessão e acesso ao projeto.
- Filtros podem ser combinados e possuem índices adequados.
- Payloads grandes usam paginação, truncamento ou carregamento sob demanda.
- Nenhum dado de outro tenant é retornado.
- Respostas seguem os contratos compartilhados.

## Testes

- Filtros, paginação, ordenação, trace inexistente e isolamento.
- Verificar ausência de N+1 nas consultas principais.
