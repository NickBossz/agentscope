COMPOSE := docker compose
BUN := bun
ENV_FILE := .env
ENV_EXAMPLE := .env.example
DATABASE_URL ?= postgresql://agentscope:agentscope@localhost:5432/agentscope

export DATABASE_URL

.DEFAULT_GOAL := help

.PHONY: help setup env install format lint typecheck test build check \
	db-generate db-check db-migrate \
	config up start stop down restart reset ps logs logs-api logs-web logs-worker \
	shell-api shell-web shell-worker shell-db

help: ## Exibe os comandos disponíveis
	@echo "AgentScope - comandos de desenvolvimento"
	@echo ""
	@echo "  setup          Prepara e valida o projeto sem iniciar o Docker"
	@echo "  env            Cria .env sem sobrescrever o existente"
	@echo "  install        Instala as dependencias com Bun"
	@echo "  format         Formata os arquivos"
	@echo "  lint           Executa o linter"
	@echo "  typecheck      Verifica os tipos TypeScript"
	@echo "  test           Executa os testes"
	@echo "  build          Gera o build dos workspaces"
	@echo "  check          Executa todas as verificacoes locais"
	@echo "  db-generate    Gera uma migracao Drizzle"
	@echo "  db-check       Valida schema e migracoes"
	@echo "  db-migrate     Executa migracoes no Docker"
	@echo "  config         Valida o Docker Compose"
	@echo "  up             Inicia o ambiente em primeiro plano"
	@echo "  start          Inicia o ambiente em segundo plano"
	@echo "  stop           Para os containers"
	@echo "  down           Remove containers e preserva volumes"
	@echo "  restart        Reinicia os servicos"
	@echo "  reset          Apaga volumes e recria o ambiente"
	@echo "  ps             Mostra o estado dos servicos"
	@echo "  logs           Acompanha todos os logs"
	@echo "  logs-api       Acompanha os logs da API"
	@echo "  logs-web       Acompanha os logs da aplicacao web"
	@echo "  logs-worker    Acompanha os logs do worker"
	@echo "  shell-api      Abre um shell na API"
	@echo "  shell-web      Abre um shell na aplicacao web"
	@echo "  shell-worker   Abre um shell no worker"
	@echo "  shell-db       Abre o psql do PostgreSQL"

setup: env install check ## Prepara e valida o projeto sem iniciar o Docker

ifeq ($(OS),Windows_NT)
env: ## Cria .env a partir de .env.example sem sobrescrever o existente
	@powershell.exe -NoProfile -Command "if (Test-Path -LiteralPath '$(ENV_FILE)') { Write-Host '$(ENV_FILE) ja existe; nenhuma alteracao foi feita.' } else { Copy-Item -LiteralPath '$(ENV_EXAMPLE)' -Destination '$(ENV_FILE)'; Write-Host '$(ENV_FILE) criado. Revise os segredos antes de usar fora do ambiente local.' }"
else
env: ## Cria .env a partir de .env.example sem sobrescrever o existente
	@if [ -f "$(ENV_FILE)" ]; then \
		echo "$(ENV_FILE) já existe; nenhuma alteração foi feita."; \
	else \
		cp "$(ENV_EXAMPLE)" "$(ENV_FILE)"; \
		echo "$(ENV_FILE) criado. Revise os segredos antes de usar fora do ambiente local."; \
	fi
endif

install: ## Instala as dependências com Bun
	$(BUN) install

format: ## Formata os arquivos do projeto
	$(BUN) run format

lint: ## Executa o linter
	$(BUN) run lint

typecheck: ## Verifica os tipos TypeScript
	$(BUN) run typecheck

test: ## Executa os testes automatizados
	$(BUN) run test

build: ## Gera o build de todos os workspaces
	$(BUN) run build

check: lint typecheck test build db-check ## Executa todas as verificações locais

db-generate: ## Gera uma migração Drizzle a partir do schema
	$(BUN) run db:generate

db-check: ## Valida o schema e as migrações Drizzle
	$(BUN) run db:check

db-migrate: env ## Executa as migrações no ambiente Docker
	$(COMPOSE) run --rm migrate

config: env ## Valida a configuração do Docker Compose
	$(COMPOSE) config

up: env ## Constrói e inicia o ambiente em primeiro plano
	$(COMPOSE) up --build

start: env ## Constrói e inicia o ambiente em segundo plano
	$(COMPOSE) up --build -d

stop: ## Para os containers sem removê-los
	$(COMPOSE) stop

down: ## Remove os containers e preserva os volumes
	$(COMPOSE) down

restart: ## Reinicia os serviços existentes
	$(COMPOSE) restart

ifeq ($(OS),Windows_NT)
reset: ## Recria o ambiente e APAGA os volumes locais
	@powershell.exe -NoProfile -Command "$$confirmation = Read-Host 'ATENCAO: os dados locais serao apagados. Digite reset para continuar'; if ($$confirmation -ne 'reset') { Write-Host 'Operacao cancelada.'; exit 1 }"
	$(COMPOSE) down --volumes --remove-orphans
	$(COMPOSE) up --build -d
else
reset: ## Recria o ambiente e APAGA os volumes locais
	@echo "ATENÇÃO: este comando apagará os dados locais do PostgreSQL e Redis."
	@printf "Digite 'reset' para continuar: "; \
	read confirmation; \
	if [ "$$confirmation" != "reset" ]; then \
		echo "Operação cancelada."; \
		exit 1; \
	fi
	$(COMPOSE) down --volumes --remove-orphans
	$(COMPOSE) up --build -d
endif

ps: ## Mostra o estado dos serviços
	$(COMPOSE) ps

logs: ## Acompanha os logs de todos os serviços
	$(COMPOSE) logs --follow --tail=200

logs-api: ## Acompanha os logs da API
	$(COMPOSE) logs --follow --tail=200 api

logs-web: ## Acompanha os logs da aplicação web
	$(COMPOSE) logs --follow --tail=200 web

logs-worker: ## Acompanha os logs do worker
	$(COMPOSE) logs --follow --tail=200 worker

shell-api: ## Abre um shell no container da API
	$(COMPOSE) exec api sh

shell-web: ## Abre um shell no container web
	$(COMPOSE) exec web sh

shell-worker: ## Abre um shell no container do worker
	$(COMPOSE) exec worker sh

shell-db: ## Abre o psql do PostgreSQL
	$(COMPOSE) exec postgres psql -U agentscope -d agentscope
