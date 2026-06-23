# Reteste da Fase 2 — 2026-06-22

Fase: 2 — Ingestão e processamento  
Ambiente: Docker Compose local, Windows/PowerShell, Bun 1.3.14  
Resultado: aprovado para o escopo das TASK-009 a TASK-016

## Automação

- lint: aprovado;
- typecheck: aprovado;
- tests: 44 aprovados, 1 integração opcional ignorada;
- build: aprovado;
- `drizzle-kit check`: aprovado;
- migração: concluída com código 0;
- Docker: API, worker, PostgreSQL, Redis e collector saudáveis.

## Validação funcional

- trace create/update: aprovado;
- span raiz, filho antes do parent e update: aprovado;
- batch misto: 1 aceito, 1 duplicado e 1 inválido;
- duplicação sequencial: mesma reserva e mesmo queue ID;
- duplicação concorrente: uma reserva e uma mensagem;
- rate limit: `429` após 120 eventos na janela;
- worker parado: evento permaneceu confirmado e foi persistido após restart;
- poison event: três tentativas e envio para dead letter;
- chave ausente, inválida, revogada e expirada: `401`;
- ambiente incompatível: `403`;
- payload inválido: `400`;
- batch acima de 100: `413`;
- rota inexistente: `404`.

## Persistência e cálculos

Trace principal:

```text
status=error
duration_ms=500
input_tokens=1010
output_tokens=505
cached_tokens=250
total_tokens=1515
estimated_cost=0.007887500000
```

O status `error` foi derivado de um span falho mesmo após update de trace com
`success`.

Custos dos spans:

```text
child=0.007812500000
parent=0.000075000000
```

Um trace com modelo sem preço permaneceu com custo desconhecido (`null`).

Após inserir uma nova versão de preço, o span histórico preservou custo e
`modelPriceId`.

## Privacidade e segurança

- passwords foram persistidos como `[REDACTED]`;
- prompts/respostas desativados não chegaram à fila;
- argumentos de tool respeitaram redação;
- API keys, authorization headers, valores sensíveis e stack traces não foram
  encontrados nos logs;
- dead letter contém somente IDs e códigos seguros.

## Observação

O comportamento fail-open de um SDK será validado na TASK-024, pois o SDK
Node.js ainda pertence à Fase 4. A indisponibilidade da API não altera o
processamento da aplicação monitorada quando o cliente trata telemetria como
best-effort.
