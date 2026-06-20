# TASK-024 — Criar SDK Node.js

**Status:** pending  
**Dependências:** TASK-009, TASK-011, TASK-012, TASK-013

## Objetivo

Oferecer uma integração Node.js simples, em batch e fail-open.

## Escopo

- Criar client configurável por API key e endpoint.
- Expor APIs para trace, span, updates e flush.
- Implementar buffer, batch transport, timeout e retries limitados.
- Garantir que falhas do AgentScope não quebrem a aplicação monitorada.
- Permitir flush no shutdown.
- Publicar tipos e exemplos de uso.

## Critérios de aceite

- SDK envia trace com spans aninhados.
- Erros de rede são tratados sem lançar por padrão no código do cliente.
- Retries não geram duplicatas graças a event IDs estáveis.
- Segredos e payloads não são logados.
- Pacote pode ser consumido por uma aplicação externa de exemplo.

## Testes

- Transporte, batch, retry, timeout, flush e fail-open.
- Teste de integração contra a API local.
