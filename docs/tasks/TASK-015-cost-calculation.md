# TASK-015 — Implementar tokens e estimativa de custos

**Status:** done
**Dependências:** TASK-004, TASK-014

## Objetivo

Calcular tokens e custos de forma determinística, histórica e decimal-safe.

## Escopo

- Implementar cadastro de preços por provider, modelo e vigência.
- Calcular custos de input, output, cache e custos externos.
- Preservar a versão de preço usada no cálculo.
- Agregar tokens e custos de spans para traces.
- Representar preço desconhecido como `unknown`.

## Critérios de aceite

- Alterar preço atual não muda custos históricos.
- Cálculos não usam ponto flutuante.
- Tokens ausentes não são confundidos com zero reportado.
- Agregação é idempotente e reprocessável.
- Custos ficam consultáveis por trace, span, projeto, modelo, provider, ambiente e período.

## Testes

- Casos de input/output/cache, preço desconhecido e mudança de vigência.
- Testes unitários com valores de precisão crítica.

## Implementação

O cálculo usa inteiros escalados com `BigInt`, sem ponto flutuante:

```text
input tokens × input price
+ output tokens × output price
+ cached tokens × cached input price
```

Preços são selecionados por provider, modelo e vigência do evento. Traces e
spans preservam `modelPriceId`, impedindo que mudanças futuras alterem custos
históricos. Preço ausente produz custo `null` (`unknown`), inclusive nos
resumos agregados.
