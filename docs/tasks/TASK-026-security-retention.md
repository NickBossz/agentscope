# TASK-026 — Reforçar segurança, retenção e exclusão

**Status:** pending  
**Dependências:** TASK-008, TASK-010, TASK-017

## Objetivo

Concluir controles transversais de segurança, privacidade e ciclo de vida dos dados.

## Escopo

- Revisar autorização de todos os endpoints.
- Aplicar rate limiting onde ainda necessário.
- Sanitizar conteúdo renderizado e respostas de erro.
- Implementar execução das políticas de retenção.
- Implementar exclusão completa e auditável de dados do projeto.
- Revisar logs, headers, cookies e configuração HTTPS.

## Critérios de aceite

- Testes não encontram leitura ou escrita cross-tenant.
- Dados expirados são removidos conforme política.
- Exclusão cobre traces, spans, tools, erros, avaliações e derivados.
- Audit logs não contêm segredos.
- Nenhum stack trace interno é exposto ao cliente.

## Testes

- Matriz de autorização, retenção, exclusão e rate limiting.
- Revisão automatizada ou manual de logs e respostas sensíveis.
