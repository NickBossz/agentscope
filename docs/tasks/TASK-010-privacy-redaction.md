# TASK-010 — Implementar privacidade e redação

**Status:** done
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

## Implementação

Os utilitários estão em `packages/shared/src/privacy.ts` e são exportados por
`@agentscope/shared`.

`applyIngestionPrivacy(event, settings)` deve ser chamado depois da validação
do contrato e antes de fila, persistência ou logs. O retorno contém somente:

- o evento seguro;
- caminhos removidos por configuração de captura;
- caminhos que receberam o marcador `[REDACTED]`.

O relatório nunca contém os valores removidos ou substituídos.

Com `capturePrompts` desativado, são removidos:

- `input`;
- mensagens `system`, `developer` e `user`;
- argumentos de tool calls.

Com `captureResponses` desativado, são removidos:

- `output`;
- mensagens `assistant` e `tool`;
- resultados de tool calls.

Campos configuráveis aceitam nomes simples, caminhos com ponto e wildcard para
arrays, por exemplo:

```json
[
  "password",
  "metadata.customer.email",
  "metadata.users.*.document"
]
```

Headers de autorização, cookies, chaves de API e padrões conhecidos de segredo
são sempre redigidos. `sanitizeForLogging` fornece a mesma proteção básica para
metadata de logs estruturados.
