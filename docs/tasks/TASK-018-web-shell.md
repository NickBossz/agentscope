# TASK-018 — Criar shell da aplicação web

**Status:** pending  
**Dependências:** TASK-005, TASK-006, TASK-007

## Objetivo

Criar a estrutura navegável do painel AgentScope.

## Escopo

- Configurar Next.js App Router, Tailwind e shadcn/ui.
- Criar layout autenticado, navegação e seletores de organização/projeto.
- Configurar TanStack Query e tratamento de sessão.
- Criar estados globais de loading, erro, vazio e acesso negado.
- Usar Server Components por padrão.

## Critérios de aceite

- Usuário navega entre dashboard, traces, projeto e API keys.
- Seleção de organização/projeto é refletida nas rotas.
- Interface é responsiva e acessível por teclado.
- Erros de API possuem recuperação clara.
- Componentes reutilizáveis sem lógica de negócio ficam em `packages/ui`.

## Testes

- Renderização de layouts, proteção de rotas e seletores.
- Verificação básica de acessibilidade.
