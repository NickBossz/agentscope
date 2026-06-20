# TASK-016 — Persistir tool calls, erros e resumos

**Status:** pending  
**Dependências:** TASK-014, TASK-015

## Objetivo

Normalizar dados necessários para investigação rápida e consultas eficientes.

## Escopo

- Persistir nome, argumentos, resultado, duração, status e retries de tools.
- Persistir erros com categoria, mensagem, stack segura e origem.
- Derivar status, duração, tokens e custo total do trace.
- Atualizar resumos sem duplicar contagens.
- Indexar categorias e campos usados em filtros.

## Critérios de aceite

- Tools e erros apontam para trace e span corretos.
- Categorias de erro seguem o PRD.
- Stack traces não são enviados diretamente ao cliente sem sanitização.
- Resumos convergem após eventos fora de ordem.
- Reprocessamento mantém os mesmos totais.

## Testes

- Tool com retry, span falho e múltiplos erros.
- Eventos fora de ordem e recomputação de resumo.
