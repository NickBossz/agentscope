# TASK-023 — Implementar avaliações manuais

**Status:** pending  
**Dependências:** TASK-017, TASK-020

## Objetivo

Permitir feedback positivo, negativo ou neutro em traces e spans.

## Escopo

- Implementar `POST /v1/traces/:traceId/evaluations`.
- Suportar label, score opcional e comentário opcional.
- Permitir vínculo a trace ou span.
- Exibir avaliações nos detalhes e score na lista.
- Registrar autor e timestamps.

## Critérios de aceite

- Somente membros autorizados avaliam recursos do projeto.
- Score e comentário são validados.
- Avaliação aparece sem recarregar toda a página.
- Conteúdo do comentário é renderizado com segurança.
- Analytics pode consumir avaliações no futuro sem mudança destrutiva.

## Testes

- Criação válida, score inválido, span incorreto e acesso cruzado.
- Atualização da interface após submissão.
