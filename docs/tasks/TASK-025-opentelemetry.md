# TASK-025 — Instrumentar o AgentScope com OpenTelemetry

**Status:** pending  
**Dependências:** TASK-003, TASK-011, TASK-014

## Objetivo

Dar observabilidade à própria plataforma sem misturar dados internos com traces de clientes.

## Escopo

- Instrumentar API, worker, PostgreSQL, Redis e fila.
- Propagar contexto por HTTP e fronteiras da fila.
- Configurar OTLP endpoint, service name e sampling por ambiente.
- Aplicar convenções semânticas.
- Remover prompts, respostas e segredos dos atributos por padrão.

## Critérios de aceite

- Uma ingestão pode ser acompanhada da API até o worker.
- Serviços possuem nomes e recursos distintos.
- Traces internos são separados dos customer traces.
- Exporter indisponível não interrompe ingestão ou processamento.
- Configuração está documentada no `.env.example`.

## Testes

- Propagação de contexto e ausência de atributos sensíveis.
- Comportamento com collector indisponível.
