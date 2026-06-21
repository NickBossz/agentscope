# TASK-008 — Implementar gerenciamento seguro de API keys

**Status:** in-progress  
**Dependências:** TASK-007

## Objetivo

Permitir criar, listar, revogar e rotacionar chaves de projeto com armazenamento seguro.

## Escopo

- Gerar chave com prefixo identificável e entropia adequada.
- Armazenar somente hash seguro, prefixo e metadados.
- Exibir a chave completa apenas na resposta de criação.
- Permitir vínculo com ambiente.
- Implementar revogação, rotação e audit log.
- Implementar autenticação de ingestão com comparação segura.

## Critérios de aceite

- A chave bruta nunca aparece no banco, logs ou listagens.
- Chaves revogadas deixam de autenticar imediatamente.
- Rotação cria uma nova chave e revoga a anterior de forma auditável.
- Chaves só autorizam o projeto ao qual pertencem.

## Testes

- Criação, autenticação, revogação, rotação e chave inválida.
- Confirmar ausência do valor bruto em persistência e logs.

## Estado atual

Criação, listagem, autenticação, revogação, rotação, auditoria e exibição única foram implementadas. A validação integrada contra PostgreSQL está pendente.
