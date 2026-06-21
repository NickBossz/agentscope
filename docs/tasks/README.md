# AgentScope — Plano de Implementação

Este diretório transforma o `docs/PRD.md` e o `AGENTS.md` em tarefas executáveis para entregar o MVP do AgentScope.

## Como usar

Execute as tarefas na ordem abaixo. Uma tarefa só pode ser marcada como concluída quando todos os critérios de aceite e verificações do seu arquivo forem atendidos.

Status sugeridos:

- `pending`
- `in-progress`
- `blocked`
- `done`

## Roadmap

### Fase 1 — Fundação

1. [TASK-001 — Estruturar o monorepo](TASK-001-monorepo.md)
2. [TASK-002 — Configurar qualidade e contratos compartilhados](TASK-002-quality-shared.md)
3. [TASK-003 — Criar ambiente local com Docker Compose](TASK-003-docker-environment.md)
4. [TASK-004 — Modelar banco de dados e migrações](TASK-004-database-schema.md)
5. [TASK-005 — Implementar autenticação de usuários](TASK-005-authentication.md)
6. [TASK-006 — Implementar organizações e isolamento de tenant](TASK-006-organizations.md)
7. [TASK-007 — Implementar projetos e configurações](TASK-007-projects.md)
8. [TASK-008 — Implementar gerenciamento seguro de API keys](TASK-008-api-keys.md)

### Fase 2 — Ingestão e processamento

9. [TASK-009 — Definir contratos de eventos e validação](TASK-009-event-contracts.md)
10. [TASK-010 — Implementar privacidade e redação](TASK-010-privacy-redaction.md)
11. [TASK-011 — Implementar ingestão de traces](TASK-011-trace-ingestion.md)
12. [TASK-012 — Implementar ingestão de spans](TASK-012-span-ingestion.md)
13. [TASK-013 — Implementar batch, idempotência e rate limiting](TASK-013-batch-idempotency.md)
14. [TASK-014 — Implementar filas e worker](TASK-014-worker-queue.md)
15. [TASK-015 — Implementar tokens e estimativa de custos](TASK-015-cost-calculation.md)
16. [TASK-016 — Persistir tool calls, erros e resumos](TASK-016-tools-errors-summaries.md)

### Fase 3 — APIs e interface

17. [TASK-017 — Implementar APIs de consulta](TASK-017-query-api.md)
18. [TASK-018 — Criar shell da aplicação web](TASK-018-web-shell.md)
19. [TASK-019 — Criar lista e filtros de traces](TASK-019-trace-list.md)
20. [TASK-020 — Criar página de detalhes do trace](TASK-020-trace-details.md)
21. [TASK-021 — Criar árvore de execução](TASK-021-execution-tree.md)
22. [TASK-022 — Criar dashboard analítico](TASK-022-analytics-dashboard.md)
23. [TASK-023 — Implementar avaliações manuais](TASK-023-manual-evaluations.md)

### Fase 4 — Integração, robustez e entrega

24. [TASK-024 — Criar SDK Node.js](TASK-024-node-sdk.md)
25. [TASK-025 — Instrumentar o AgentScope com OpenTelemetry](TASK-025-opentelemetry.md)
26. [TASK-026 — Reforçar segurança, retenção e exclusão](TASK-026-security-retention.md)
27. [TASK-027 — Cobrir fluxos críticos com testes E2E](TASK-027-e2e-tests.md)
28. [TASK-028 — Finalizar documentação e validar release](TASK-028-release-readiness.md)

## Validação humana por fase

Os testes automatizados continuam obrigatórios, mas não substituem a validação humana. Ao concluir cada fase, uma pessoa deve executar o roteiro correspondente e registrar:

- data e ambiente testado;
- versão ou commit testado;
- itens aprovados e reprovados;
- evidências relevantes, como screenshots e respostas HTTP;
- bugs encontrados e tarefas criadas para corrigi-los.

Uma fase só deve ser considerada completamente validada quando todos os itens obrigatórios do roteiro passarem.

### Preparação do ambiente local

Pré-requisitos:

- Bun 1.3 ou superior;
- Docker com Docker Compose;
- portas `3000`, `3001`, `5432`, `6379`, `4317` e `4318` disponíveis.

Com `make` instalado:

```bash
make setup
make config
make start
```

Esses comandos executam instalação, verificações, validação do Compose e inicialização em segundo plano. Use `make logs` para acompanhar a subida dos serviços.

No PowerShell, sem `make`:

```powershell
Copy-Item .env.example .env
bun install
bun run lint
bun run typecheck
bun run test
bun run build
docker compose config
docker compose up --build
```

Antes de usar o ambiente fora do desenvolvimento local, substitua os segredos de exemplo do `.env`.

Confirme que:

- a aplicação web abre em `http://localhost:3000`;
- `http://localhost:3001/health` retorna status `200`;
- `docker compose ps` mostra os serviços esperados como saudáveis;
- o serviço `migrate` termina com código `0`;
- API e worker não exibem credenciais ou segredos nos logs.

Para encerrar:

```bash
make down
```

Sem `make`, use `docker compose down`.

Use `make reset` somente quando quiser apagar todo o banco e repetir o teste desde o início. O comando exige confirmação explícita antes de remover os volumes.

### Fase 1 — Fundação

Objetivo humano: provar que uma pessoa consegue criar sua conta, organização, projeto e API key com isolamento e comportamento seguro.

#### Fluxo principal

1. Abra `http://localhost:3000/signup`.
2. Crie uma conta com nome, e-mail e senha de pelo menos 12 caracteres.
3. Confirme que o cadastro redireciona para `/dashboard`.
4. Atualize a página e confirme que a sessão continua válida.
5. Crie uma organização com nome e slug.
6. Confirme que a organização aparece selecionada e o usuário possui papel `owner`.
7. Crie um projeto informando nome, slug, descrição e ambiente.
8. Confirme que o projeto aparece na lista e pode ser selecionado.
9. Gere uma API key para cada ambiente necessário.
10. Copie a chave exibida e confirme que o valor completo aparece apenas nessa criação.
11. Atualize a página e confirme que a listagem mostra somente o prefixo mascarado.
12. Rotacione uma chave e confirme que:
    - uma nova chave é exibida uma única vez;
    - a chave anterior fica revogada;
    - a nova chave aparece ativa.
13. Revogue a nova chave e confirme que seu status muda para `revoked`.
14. Saia da conta e confirme que o dashboard deixa de ser acessível.
15. Entre novamente e confirme que organização, projeto e chaves continuam persistidos.

#### Testes negativos obrigatórios

- Tente cadastrar o mesmo e-mail novamente: deve haver erro e nenhum usuário duplicado.
- Tente usar senha com menos de 12 caracteres: o cadastro deve ser rejeitado.
- Tente criar organização ou projeto com slug inválido: a operação deve ser rejeitada.
- Tente criar dois projetos com o mesmo slug na mesma organização: deve haver conflito.
- Tente gerar chave em projeto arquivado: a operação deve ser rejeitada.
- Depois de criar uma API key, procure o valor completo nos logs e na listagem: ele não pode aparecer.
- Abra `/dashboard` em janela anônima: a aplicação deve exigir autenticação.
- Altere manualmente um ID de organização ou projeto em uma requisição: dados de outro tenant não podem ser retornados.

#### Inspeção técnica

```powershell
docker compose logs api
docker compose logs worker
docker compose exec postgres psql -U agentscope -d agentscope -c "\dt"
docker compose exec postgres psql -U agentscope -d agentscope -c "select prefix, environment, revoked_at, length(key_hash) as hash_length from api_keys;"
```

Resultados esperados:

- as tabelas da migração existem;
- `api_keys` contém hash e prefixo, nunca a chave bruta;
- reiniciar API e web não encerra sessões ainda válidas;
- reiniciar PostgreSQL e Redis não apaga os dados persistidos;
- erros apresentados ao usuário não contêm stack traces internos.

### Fase 2 — Ingestão e processamento

Objetivo humano: provar que uma aplicação externa consegue enviar eventos de forma rápida, segura, assíncrona e idempotente.

Valide:

1. Crie uma API key de desenvolvimento pela interface.
2. Envie um trace pela API com um `eventId` único.
3. Envie spans raiz e filhos, incluindo um span antes de seu parent.
4. Atualize trace e spans para estados finais.
5. Envie um batch contendo eventos válidos, inválidos e duplicados.
6. Reenvie o mesmo `eventId` e confirme que não há duplicação no banco.
7. Envie tool call, erro, tokens e informações de modelo.
8. Confirme que o worker persiste os eventos e calcula duração, totais e custos.
9. Desative captura de prompts e respostas no projeto e envie novo trace.
10. Confirme que o conteúdo desativado não chegou à fila, banco ou logs.

Testes negativos obrigatórios:

- chave ausente, inválida, revogada ou expirada retorna `401`;
- chave de um projeto não consegue gravar em outro projeto;
- payload inválido retorna erro legível por máquina;
- batch acima do limite é rejeitado;
- rate limit é aplicado;
- reinício do worker não perde evento confirmado;
- falha permanente termina no mecanismo de dead letter;
- indisponibilidade do AgentScope não quebra a aplicação que usa o SDK ou cliente fail-open.

### Fase 3 — APIs e interface

Objetivo humano: provar que alguém consegue localizar, compreender e avaliar uma execução real.

Valide:

1. Abra a lista de traces e confira colunas, paginação e ordenação.
2. Teste individualmente e em combinação todos os filtros do PRD.
3. Copie uma URL filtrada, abra em outra aba e confirme que o estado é restaurado.
4. Abra um trace com prompts, respostas, tools, erros, custos e metadata.
5. Confirme que payloads grandes não quebram nem travam a página.
6. Inspecione a árvore com múltiplos níveis, roots, parent ausente e spans fora de ordem.
7. Teste seleção, expansão, recolhimento, zoom e pan.
8. Confirme que ciclos ou dados incompletos não travam a renderização.
9. Compare os números do dashboard com consultas ou dados conhecidos.
10. Troque o período e valide total, success rate, média, P50, P95 e P99.
11. Crie avaliações positiva, neutra e negativa, com e sem score/comentário.
12. Teste navegação por teclado e os estados de loading, vazio, erro e acesso negado.

Testes negativos obrigatórios:

- usuário sem acesso ao projeto não visualiza traces ou analytics;
- conteúdo controlado pelo usuário não executa HTML ou scripts;
- custo desconhecido aparece como desconhecido, não como zero;
- trace inexistente retorna estado `404` amigável;
- falha parcial de uma consulta não destrói toda a tela.

### Fase 4 — Integração, robustez e release

Objetivo humano: provar que o produto pode ser integrado, observado, instalado e operado por outra pessoa.

Valide:

1. Siga a documentação em uma máquina ou ambiente limpo.
2. Integre uma aplicação Node.js usando somente a documentação do SDK.
3. Gere um trace com spans aninhados, batch, retry e flush no shutdown.
4. Simule API indisponível e confirme o comportamento fail-open do SDK.
5. Acompanhe uma ingestão da API até o worker pelo OpenTelemetry.
6. Confirme que traces internos não se misturam aos traces dos clientes.
7. Teste expiração por retenção e exclusão completa de dados de projeto.
8. Revise logs, cookies, headers e respostas procurando segredos ou stack traces.
9. Execute o fluxo E2E completo mais de uma vez para detectar flakiness.
10. Execute todos os comandos do checklist final de release.

Testes negativos obrigatórios:

- tentativas cross-tenant de leitura e escrita falham;
- collector OpenTelemetry indisponível não derruba API ou worker;
- retries do SDK não criam eventos duplicados;
- exclusão remove dados principais e derivados;
- instalação limpa não depende de arquivo local não documentado;
- nenhum segredo real está versionado ou embutido nas imagens.

### Registro de aprovação

Ao terminar uma fase, adicione um registro no pull request ou relatório de release:

```text
Fase:
Commit:
Data:
Ambiente:
Responsável:

Automação:
- lint:
- typecheck:
- tests:
- build:
- migrations:
- docker:

Validação humana:
- fluxo principal:
- testes negativos:
- isolamento de tenant:
- revisão de logs e segredos:

Resultado: aprovado | reprovado
Observações:
```

## Regras globais

Todas as tarefas devem respeitar:

- TypeScript em modo estrito e sem `any`;
- validação em runtime de toda entrada externa;
- autorização no servidor e isolamento por organização/projeto;
- UTC para timestamps, milissegundos para duração e aritmética decimal segura para dinheiro;
- testes no nível apropriado;
- ausência de segredos, prompts, respostas ou headers de autorização em logs;
- atualização da documentação quando contratos, configuração ou arquitetura mudarem.

## Definition of Done do MVP

O projeto estará pronto quando as 28 tarefas estiverem concluídas e:

- o fluxo completo de cadastro até inspeção de um trace funcionar;
- eventos duplicados não gerarem dados duplicados;
- traces com spans aninhados, fora de ordem ou incompletos forem tratados;
- prompts e respostas respeitarem as configurações de captura e redação;
- custos, tokens, ferramentas, erros e avaliações forem exibidos corretamente;
- dashboard, filtros e árvore de execução estiverem funcionais;
- `bun run lint`, `bun run typecheck`, `bun run test` e `bun run build` passarem;
- `docker compose config` e `docker compose up --build` funcionarem;
- não houver exposição cruzada entre tenants.
