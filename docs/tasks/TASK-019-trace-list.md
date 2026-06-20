# TASK-019 — Criar lista e filtros de traces

**Status:** pending  
**Dependências:** TASK-017, TASK-018

## Objetivo

Permitir localizar rapidamente traces relevantes em uma tabela eficiente.

## Escopo

- Criar tabela com todos os campos exigidos no PRD.
- Implementar filtros de projeto, ambiente, período, status, modelo, provider, usuário, sessão, duração, custo, erro, tool e tags.
- Sincronizar filtros com query parameters da URL.
- Implementar paginação, ordenação e estados de dados.
- Usar formatação segura para custo, duração e tokens.

## Critérios de aceite

- URL filtrada pode ser compartilhada e restaurada.
- Filtros combinados retornam resultados consistentes.
- Tabela é acessível por teclado.
- Loading, vazio, erro e dados parciais são tratados.
- Clicar em uma linha abre o trace correto.

## Testes

- Serialização de filtros, paginação e navegação.
- Teste de interface com combinações críticas.
