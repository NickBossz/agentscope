# TASK-006 — Implementar organizações e isolamento de tenant

**Status:** pending  
**Dependências:** TASK-004, TASK-005

## Objetivo

Criar organizações e garantir que todo acesso seja limitado ao tenant autorizado.

## Escopo

- Criar organização e vínculo do criador como `owner`.
- Listar e selecionar organizações do usuário.
- Preparar papéis `owner`, `admin`, `developer` e `viewer`.
- Criar helpers centrais de autorização.
- Registrar testes negativos de acesso cruzado.

## Critérios de aceite

- Usuário autenticado pode criar e selecionar organização.
- Usuário sem vínculo não acessa recursos da organização.
- Toda mutação valida papel e vínculo no servidor.
- Não existem queries de tenant sem escopo explícito.

## Testes

- Testar permissões por papel.
- Testar tentativas de leitura e escrita entre organizações.
