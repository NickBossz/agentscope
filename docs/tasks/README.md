# AgentScope — Plano de Implementação

Este diretório transforma o `PRD.md` e o `AGENTS.md` em tarefas executáveis para entregar o MVP do AgentScope.

## Como usar

Execute as tarefas na ordem abaixo. Uma tarefa só pode ser marcada como concluída quando todos os critérios de aceite e verificações do seu arquivo forem atendidos.

Status sugeridos:

- `pending`
- `in-progress`
- `blocked`
- `done`

## Roadmap

### Fase 1 — Fundação

1. [TASK-001 — Estruturar o monorepo](TASK-001-monorepo.md)
2. [TASK-002 — Configurar qualidade e contratos compartilhados](TASK-002-quality-shared.md)
3. [TASK-003 — Criar ambiente local com Docker Compose](TASK-003-docker-environment.md)
4. [TASK-004 — Modelar banco de dados e migrações](TASK-004-database-schema.md)
5. [TASK-005 — Implementar autenticação de usuários](TASK-005-authentication.md)
6. [TASK-006 — Implementar organizações e isolamento de tenant](TASK-006-organizations.md)
7. [TASK-007 — Implementar projetos e configurações](TASK-007-projects.md)
8. [TASK-008 — Implementar gerenciamento seguro de API keys](TASK-008-api-keys.md)

### Fase 2 — Ingestão e processamento

9. [TASK-009 — Definir contratos de eventos e validação](TASK-009-event-contracts.md)
10. [TASK-010 — Implementar privacidade e redação](TASK-010-privacy-redaction.md)
11. [TASK-011 — Implementar ingestão de traces](TASK-011-trace-ingestion.md)
12. [TASK-012 — Implementar ingestão de spans](TASK-012-span-ingestion.md)
13. [TASK-013 — Implementar batch, idempotência e rate limiting](TASK-013-batch-idempotency.md)
14. [TASK-014 — Implementar filas e worker](TASK-014-worker-queue.md)
15. [TASK-015 — Implementar tokens e estimativa de custos](TASK-015-cost-calculation.md)
16. [TASK-016 — Persistir tool calls, erros e resumos](TASK-016-tools-errors-summaries.md)

### Fase 3 — APIs e interface

17. [TASK-017 — Implementar APIs de consulta](TASK-017-query-api.md)
18. [TASK-018 — Criar shell da aplicação web](TASK-018-web-shell.md)
19. [TASK-019 — Criar lista e filtros de traces](TASK-019-trace-list.md)
20. [TASK-020 — Criar página de detalhes do trace](TASK-020-trace-details.md)
21. [TASK-021 — Criar árvore de execução](TASK-021-execution-tree.md)
22. [TASK-022 — Criar dashboard analítico](TASK-022-analytics-dashboard.md)
23. [TASK-023 — Implementar avaliações manuais](TASK-023-manual-evaluations.md)

### Fase 4 — Integração, robustez e entrega

24. [TASK-024 — Criar SDK Node.js](TASK-024-node-sdk.md)
25. [TASK-025 — Instrumentar o AgentScope com OpenTelemetry](TASK-025-opentelemetry.md)
26. [TASK-026 — Reforçar segurança, retenção e exclusão](TASK-026-security-retention.md)
27. [TASK-027 — Cobrir fluxos críticos com testes E2E](TASK-027-e2e-tests.md)
28. [TASK-028 — Finalizar documentação e validar release](TASK-028-release-readiness.md)

## Regras globais

Todas as tarefas devem respeitar:

- TypeScript em modo estrito e sem `any`;
- validação em runtime de toda entrada externa;
- autorização no servidor e isolamento por organização/projeto;
- UTC para timestamps, milissegundos para duração e aritmética decimal segura para dinheiro;
- testes no nível apropriado;
- ausência de segredos, prompts, respostas ou headers de autorização em logs;
- atualização da documentação quando contratos, configuração ou arquitetura mudarem.

## Definition of Done do MVP

O projeto estará pronto quando as 28 tarefas estiverem concluídas e:

- o fluxo completo de cadastro até inspeção de um trace funcionar;
- eventos duplicados não gerarem dados duplicados;
- traces com spans aninhados, fora de ordem ou incompletos forem tratados;
- prompts e respostas respeitarem as configurações de captura e redação;
- custos, tokens, ferramentas, erros e avaliações forem exibidos corretamente;
- dashboard, filtros e árvore de execução estiverem funcionais;
- `bun run lint`, `bun run typecheck`, `bun run test` e `bun run build` passarem;
- `docker compose config` e `docker compose up --build` funcionarem;
- não houver exposição cruzada entre tenants.
