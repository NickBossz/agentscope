# TASK-020 — Criar página de detalhes do trace

**Status:** pending  
**Dependências:** TASK-017, TASK-018

## Objetivo

Centralizar toda a investigação de uma execução em uma única página.

## Escopo

- Exibir resumo, input/output, tokens, custo, duração e status.
- Exibir tags, metadata, timeline, spans, tools, erros e avaliações.
- Criar viewers para mensagens, JSON e stack traces sanitizados.
- Truncar ou virtualizar payloads grandes.
- Manter informações críticas visíveis sem excesso de diálogos.

## Critérios de aceite

- Dados incompletos ou ainda em processamento não quebram a página.
- Conteúdo sensível respeita configurações de captura.
- Usuário consegue localizar o span associado a tool ou erro.
- JSON e textos longos permanecem utilizáveis.
- Status running, success e error são claros.

## Testes

- Trace completo, incompleto, falho e com payload grande.
- Estados de autorização, inexistente e carregamento parcial.
