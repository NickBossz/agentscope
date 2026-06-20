# TASK-028 — Finalizar documentação e validar release

**Status:** pending  
**Dependências:** TASK-001 até TASK-027

## Objetivo

Confirmar que o MVP pode ser instalado, operado e demonstrado por outra pessoa.

## Escopo

- Atualizar README, arquitetura, setup local e troubleshooting.
- Documentar variáveis, migrations, payloads, endpoints e SDK.
- Incluir exemplos de trace, span, batch e avaliação.
- Criar dados ou script seguro de demonstração.
- Revisar dependências, segredos, licenças e limitações conhecidas.
- Executar checklist completo de release.

## Critérios de aceite

- Uma instalação limpa funciona seguindo apenas a documentação.
- Todos os critérios de aceite do PRD são demonstráveis.
- `bun run lint`, `bun run typecheck`, `bun run test` e `bun run build` passam.
- Migration checks passam.
- `docker compose config` e `docker compose up --build` passam.
- Não há segredos, mudanças acidentais ou falhas críticas conhecidas.
- Limitações restantes estão documentadas sem incluir features pós-MVP como obrigatórias.

## Entrega

- Registrar versões testadas e resultados dos comandos.
- Produzir checklist final relacionando os critérios do PRD às funcionalidades entregues.
