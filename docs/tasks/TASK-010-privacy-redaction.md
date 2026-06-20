# TASK-010 — Implementar privacidade e redação

**Status:** pending  
**Dependências:** TASK-007, TASK-009

## Objetivo

Aplicar configurações de captura e remover dados sensíveis antes do enfileiramento.

## Escopo

- Respeitar desativação de prompts e respostas por projeto.
- Redigir headers de autorização e padrões conhecidos de segredo.
- Permitir lista configurável de campos a redigir.
- Separar claramente valores capturados de valores redigidos.
- Criar utilitários determinísticos e testáveis.

## Critérios de aceite

- Redação ocorre antes de fila, persistência e logs.
- Headers de autorização nunca são armazenados.
- Captura desativada não deixa conteúdo recuperável.
- Objetos e arrays aninhados são tratados.
- A redação não altera campos não configurados.

## Testes

- Segredos conhecidos, campos aninhados, arrays e captura desativada.
- Regressão para impedir dados sensíveis em logs de erro.
