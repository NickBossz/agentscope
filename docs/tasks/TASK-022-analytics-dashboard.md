# TASK-022 — Criar dashboard analítico

**Status:** pending  
**Dependências:** TASK-015, TASK-016, TASK-017, TASK-018

## Objetivo

Apresentar saúde, uso, latência e custo do projeto em um período selecionável.

## Escopo

- Exibir totais, sucesso, falhas, success rate e latência média.
- Calcular e exibir P50, P95 e P99.
- Exibir tokens, custos, modelos, tools e erros mais frequentes.
- Criar gráficos com Recharts.
- Implementar seletor de período e estados sem dados.
- Garantir que agregações sejam feitas fora do caminho de ingestão.

## Critérios de aceite

- Métricas usam o mesmo período e timezone explícito.
- Percentis são calculados corretamente.
- Custos desconhecidos não aparecem como zero.
- Mudança de período atualiza cards e gráficos.
- Consultas comuns atendem ao alvo P95 de 1,5 segundo em carga de desenvolvimento.

## Testes

- Helpers de percentil e agregação.
- Dashboard sem dados, com dados parciais e múltiplos ambientes.
