# AgentScope

AgentScope is an observability platform for AI agents. This repository is a Bun monorepo containing the web application, API, worker, shared contracts, database package, telemetry helpers, UI primitives, and Node.js SDK.

## Requirements

- Bun 1.2+
- Docker with Docker Compose

## Local setup

1. Copy `.env.example` to `.env`.
2. Replace the development secrets before using the project outside a local machine.
3. Install dependencies with `bun install`.
4. Start infrastructure and applications with `docker compose up --build`.

The web application runs on `http://localhost:3000` and the API on `http://localhost:3001`.

## Makefile

Em Linux, macOS, WSL ou Git Bash com `make` instalado, use:

```bash
make help
make setup
make start
make ps
make logs
```

No Windows, execute pelo WSL/Git Bash ou instale GNU Make com um gerenciador como Chocolatey ou Scoop. O PowerShell puro não inclui `make` por padrão.

Atalhos principais:

- `make check`: lint, typecheck, testes, build e validação das migrações;
- `make up`: inicia o ambiente em primeiro plano;
- `make start`: inicia em segundo plano;
- `make down`: remove containers e preserva os dados;
- `make reset`: solicita confirmação, apaga volumes e recria o ambiente;
- `make shell-db`: abre o PostgreSQL com `psql`;
- `make logs-api`, `make logs-web` e `make logs-worker`: acompanham logs específicos.

## Development commands

```bash
bun run dev
bun run lint
bun run typecheck
bun run test
bun run build
bun run db:migrate
```

See `docs/PRD.md`, `AGENTS.md`, and `docs/tasks/README.md` for product and implementation guidance.
