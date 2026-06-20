# TASK-027 — Cobrir fluxos críticos com testes E2E

**Status:** pending  
**Dependências:** TASK-019, TASK-020, TASK-021, TASK-022, TASK-023, TASK-024

## Objetivo

Provar que o principal fluxo do produto funciona de ponta a ponta.

## Escopo

- Automatizar cadastro e login.
- Criar organização e projeto.
- Gerar API key.
- Enviar trace com spans aninhados, prompts, tool call e erro.
- Validar processamento assíncrono.
- Abrir lista, aplicar filtros e inspecionar detalhes e árvore.
- Enviar avaliação e validar dashboard.

## Critérios de aceite

- Fluxo completo passa em ambiente limpo.
- Testes aguardam processamento sem sleeps frágeis.
- Há cenário de evento duplicado.
- Há cenário de tentativa cross-tenant.
- Há cenário com captura de prompt/response desativada.

## Verificação

- Executar suite E2E repetidamente para detectar flakiness.
- Registrar instruções para execução local e CI.
