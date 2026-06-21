# TASK-002 — Configurar qualidade e contratos compartilhados

**Status:** done  
**Dependências:** TASK-001

## Objetivo

Estabelecer padrões de código e uma única fonte para tipos, schemas, constantes e erros de domínio.

## Escopo

- Configurar formatter, lint, TypeScript estrito e test runner.
- Definir envelope padrão de sucesso e erro da API.
- Criar tipos nominais ou equivalentes para IDs de domínio.
- Criar enums/unions para status, ambientes, tipos de span e categorias de erro.
- Configurar validação de variáveis de ambiente no startup.

## Critérios de aceite

- Frontend, API e worker reutilizam contratos de `packages/shared`.
- Entradas externas são representadas por schemas de runtime.
- Não há `any` nos contratos públicos.
- Erros retornam código legível por máquina, mensagem e detalhes seguros.

## Testes

- Testar schemas, envelopes e validação de ambiente.
- Executar lint e typecheck em todos os workspaces.
