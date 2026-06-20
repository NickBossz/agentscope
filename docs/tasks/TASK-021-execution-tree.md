# TASK-021 — Criar árvore de execução

**Status:** pending  
**Dependências:** TASK-020

## Objetivo

Visualizar relações parent-child entre spans e permitir inspeção interativa.

## Escopo

- Construir árvore por `spanId` e `parentSpanId`.
- Tratar roots múltiplos, parent ausente, spans fora de ordem e ciclos.
- Criar visualização com React Flow.
- Exibir nome, tipo, status, duração, tokens e custo em cada nó.
- Implementar expand/collapse, seleção, zoom e pan.
- Abrir detalhes do span selecionado.

## Critérios de aceite

- Ordem do array não influencia a hierarquia.
- Ciclos não causam loop ou travamento.
- Falhas e spans em execução são visualmente distintos.
- Traces grandes continuam utilizáveis com lazy rendering, collapse ou virtualização.
- Seleção sincroniza com o painel de detalhes.

## Testes

- Unitários do construtor para árvore normal, órfãos e ciclos.
- Interação de seleção, collapse, zoom e trace grande.
