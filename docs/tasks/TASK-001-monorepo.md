# TASK-001 — Estruturar o monorepo

**Status:** done  
**Dependências:** nenhuma

## Objetivo

Criar a base do monorepo Bun com os aplicativos e pacotes definidos na arquitetura.

## Escopo

- Criar `apps/web`, `apps/api` e `apps/worker`.
- Criar `packages/database`, `packages/shared`, `packages/sdk-node`, `packages/telemetry` e `packages/ui`.
- Configurar workspaces, scripts raiz e TypeScript compartilhado.
- Adicionar `.gitignore`, `.env.example` e README de setup.
- Definir scripts para desenvolvimento, build, lint, typecheck e testes.

## Critérios de aceite

- `bun install` reconhece todos os workspaces.
- Cada workspace possui responsabilidade e entrypoint claros.
- `bun run typecheck` funciona a partir da raiz.
- Nenhum segredo ou `.env` real é versionado.
- A estrutura segue `AGENTS.md`.

## Verificação

- Executar instalação, typecheck e build inicial.
- Confirmar que imports entre pacotes usam aliases estáveis.
