# TASK-004 — Modelar banco de dados e migrações

**Status:** in-progress  
**Dependências:** TASK-001, TASK-002, TASK-003

## Objetivo

Implementar o modelo PostgreSQL do MVP com Drizzle e isolamento explícito por tenant.

## Escopo

- Criar tabelas para usuários, organizações, membros, projetos, API keys, traces, spans, tool calls, avaliações, preços e configurações.
- Incluir IDs de organização/projeto nas tabelas sensíveis.
- Criar constraints para relações, eventos externos e idempotência.
- Criar índices para filtros e joins frequentes.
- Usar soft delete onde auditoria for necessária.
- Criar client, migrations e helpers de transação.

## Critérios de aceite

- Migrações aplicam em um banco vazio e podem ser reproduzidas.
- Relações trace/span e parent span aceitam ingestão fora de ordem.
- Valores monetários não usam ponto flutuante.
- Timestamps usam UTC e durações usam milissegundos.
- Queries sensíveis exigem escopo de organização ou projeto.

## Testes

- Testar constraints, transações, índices críticos e isolamento.
- Executar migration check em banco limpo.

## Estado atual

O schema, a migração gerada e o `drizzle-kit check` estão concluídos. A aplicação da migração e os testes de integração aguardam um PostgreSQL disponível.
