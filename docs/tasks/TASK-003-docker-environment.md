# TASK-003 — Criar ambiente local com Docker Compose

**Status:** in-progress  
**Dependências:** TASK-001

## Objetivo

Permitir que todo o ambiente local seja iniciado por Docker Compose.

## Escopo

- Configurar serviços `web`, `api`, `worker`, `postgres`, `redis` e `otel-collector`.
- Adicionar volumes, redes, health checks e dependências saudáveis.
- Criar Dockerfiles multi-stage quando apropriado.
- Documentar portas e variáveis no `.env.example`.
- Usar versões principais fixadas e usuários não-root quando viável.

## Critérios de aceite

- `docker compose config` é válido.
- `docker compose up --build` inicia todos os serviços.
- API e worker aguardam PostgreSQL e Redis ficarem saudáveis.
- Dados locais persistem nos volumes esperados.
- Segredos não são embutidos nas imagens.

## Verificação

- Testar reinício dos containers.
- Confirmar conectividade entre os serviços e health endpoints.

## Estado atual

A configuração foi criada, mas a validação com `docker compose` está pendente porque Docker não está instalado no ambiente atual.
