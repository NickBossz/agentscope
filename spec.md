RPD — Observabilidade para Agentes de IA
1. Visão geral
Nome provisório

AgentScope

Outras opções:

TraceMind
AgentWatch
LLM Observer
AgentLens
NeuralTrace
Descrição

O AgentScope será uma plataforma de observabilidade voltada para aplicações que utilizam agentes de inteligência artificial e modelos de linguagem.

A plataforma permitirá que desenvolvedores acompanhem detalhadamente cada execução realizada por um agente, incluindo prompts, respostas, ferramentas chamadas, consumo de tokens, custos, erros, avaliações e fluxo completo da execução.

O sistema funcionará como um “painel de controle” central para aplicações de IA, permitindo investigar problemas, medir desempenho, comparar versões e entender como os agentes chegaram a determinado resultado.

Nível do projeto

Avançado

O projeto envolve:

processamento de eventos;
rastreamento distribuído;
análise de grandes volumes de dados;
integração com aplicações externas;
armazenamento analítico;
visualização de árvores de execução;
métricas em tempo real;
controle de custos;
avaliação de respostas de IA.
2. Problema

Aplicações com agentes de IA são difíceis de monitorar porque uma única requisição pode envolver várias etapas:

recebimento da mensagem do usuário;
geração de um prompt;
chamada para um modelo de IA;
decisão de utilizar uma ferramenta;
execução da ferramenta;
nova chamada para o modelo;
geração da resposta final.

Quando alguma coisa dá errado, é difícil descobrir:

qual prompt foi realmente enviado;
por que o agente chamou determinada ferramenta;
em qual etapa ocorreu o erro;
quanto a execução custou;
quantos tokens foram utilizados;
quanto tempo cada etapa levou;
qual versão do prompt ou modelo gerou o problema;
se a resposta foi considerada boa ou ruim;
se houve repetição desnecessária de chamadas.

Logs tradicionais geralmente não representam bem esse fluxo, principalmente quando existem execuções assíncronas, múltiplos agentes, chamadas encadeadas e ferramentas externas.

3. Solução proposta

Criar uma plataforma que receba eventos de telemetria das aplicações de IA e transforme esses eventos em traces visuais.

Cada execução será representada por um trace.

Um trace poderá conter vários spans, representando etapas individuais, como:

Execução do agente
├── Preparação do contexto
├── Chamada ao modelo GPT
│   ├── Prompt enviado
│   ├── Resposta recebida
│   └── Contagem de tokens
├── Chamada da ferramenta buscar_clima
│   ├── Parâmetros
│   ├── Resultado
│   └── Tempo de execução
├── Segunda chamada ao modelo
└── Resposta final

O sistema disponibilizará dashboards, busca, filtros, alertas e uma tela detalhada para investigação de cada execução.

4. Objetivos do produto
Objetivo principal

Permitir que equipes desenvolvam, monitorem e melhorem aplicações baseadas em agentes de IA por meio de dados detalhados sobre cada execução.

Objetivos secundários
reduzir o tempo necessário para encontrar erros;
identificar prompts com desempenho ruim;
monitorar custos por projeto, usuário e modelo;
encontrar gargalos de desempenho;
visualizar decisões tomadas pelo agente;
comparar versões de prompts;
avaliar automaticamente respostas;
identificar loops e chamadas desnecessárias;
centralizar logs de diferentes aplicações de IA;
permitir o acompanhamento de aplicações em produção.
5. Público-alvo
Desenvolvedores de aplicações de IA

Precisam investigar erros, chamadas de ferramentas e respostas inesperadas.

Engenheiros de machine learning

Precisam comparar modelos, prompts, configurações e resultados.

Equipes de produto

Precisam entender qualidade, custo e utilização das funcionalidades de IA.

Empresas com aplicações baseadas em LLMs

Precisam controlar gastos, confiabilidade, privacidade e desempenho.

Pesquisadores e estudantes

Precisam analisar o comportamento de agentes em diferentes cenários.

6. Proposta de valor

A plataforma permitirá responder perguntas como:

Por que o agente apresentou essa resposta?
Qual ferramenta foi chamada antes do erro?
Quanto essa execução custou?
Qual modelo apresenta melhor custo-benefício?
Qual versão do prompt gera respostas melhores?
Qual etapa está deixando o agente lento?
Quantos erros ocorreram hoje?
Quais usuários estão consumindo mais tokens?
O agente entrou em um loop?
Quais respostas receberam avaliações negativas?
Qual ferramenta externa mais falha?
Quanto cada projeto gastou no mês?
7. Escopo funcional
7.1 Organizações

O sistema deverá permitir a criação de organizações para agrupar usuários e projetos.

Cada organização poderá possuir:

nome;
descrição;
logotipo;
membros;
projetos;
plano;
limites de utilização;
configurações de retenção de dados.
Papéis
proprietário;
administrador;
desenvolvedor;
analista;
somente leitura.
7.2 Projetos

Cada aplicação monitorada será registrada como um projeto.

Dados do projeto:

nome;
descrição;
ambiente;
framework utilizado;
data de criação;
chave de API;
limite mensal de eventos;
configuração de retenção;
modelos permitidos;
tags.

Ambientes suportados:

desenvolvimento;
homologação;
produção;
personalizado.
7.3 Chaves de API

Cada projeto deverá possuir uma ou mais chaves de API para envio de telemetria.

Exemplo:

ags_live_8e9120f11a...

Funcionalidades:

criação;
revogação;
rotação;
data de expiração;
identificação da última utilização;
restrição por ambiente;
limite de requisições;
mascaramento da chave no painel.
7.4 Coleta de traces

A plataforma deverá receber traces por meio de uma API.

Cada trace representa uma execução completa do agente.

Informações do trace
ID;
projeto;
organização;
ambiente;
nome da execução;
data e hora de início;
data e hora de término;
duração total;
status;
usuário final;
sessão;
modelo principal;
custo total;
quantidade de tokens;
entrada inicial;
saída final;
tags;
metadados;
versão da aplicação;
versão do prompt;
versão do agente.
Status possíveis
em andamento;
concluído;
concluído com alertas;
falhou;
cancelado;
timeout.
7.5 Spans

Cada trace será dividido em spans.

Um span representa uma operação individual dentro da execução.

Tipos de span
chamada de LLM;
execução de ferramenta;
busca em banco de dados;
recuperação de contexto;
embedding;
reranking;
execução de código;
requisição HTTP;
execução de agente;
processamento interno;
avaliação;
operação personalizada.
Informações do span
ID;
trace pai;
span pai;
nome;
tipo;
início;
término;
duração;
status;
entrada;
saída;
erro;
metadados;
tags.
7.6 Registro de prompts

O sistema deverá armazenar os prompts enviados aos modelos.

Dados registrados:

system prompt;
mensagens anteriores;
mensagem do usuário;
contexto recuperado;
parâmetros do modelo;
ferramentas disponíveis;
temperatura;
top P;
limite de tokens;
formato de resposta;
versão do prompt.

A plataforma deverá diferenciar:

System
User
Assistant
Tool
Developer

Também deverá ser possível ocultar ou mascarar informações sensíveis.

7.7 Registro de respostas

Para cada chamada de modelo, deverão ser registrados:

texto da resposta;
resposta estruturada;
motivo de encerramento;
chamadas de ferramentas;
tokens de entrada;
tokens de saída;
tokens em cache;
latência;
modelo;
provedor;
custo estimado;
identificador da requisição no provedor.
7.8 Monitoramento de tokens

O sistema deverá contabilizar:

tokens de entrada;
tokens de saída;
tokens totais;
tokens em cache;
tokens utilizados em raciocínio, quando disponíveis;
média de tokens por execução;
tokens por usuário;
tokens por projeto;
tokens por modelo;
tokens por período.
7.9 Estimativa de custos

O custo deverá ser calculado com base em:

provedor;
modelo;
tokens de entrada;
tokens de saída;
tokens em cache;
preço configurado;
moeda.

Exemplo:

Custo =
(tokens de entrada × preço de entrada)
+
(tokens de saída × preço de saída)

A plataforma deverá permitir:

tabela automática de preços;
preço personalizado;
conversão de moeda;
custo por trace;
custo por usuário;
custo por projeto;
custo por modelo;
custo por ferramenta;
custo diário e mensal.

Também poderá registrar custos externos, como:

APIs de busca;
execução de código;
serviços de voz;
geração de imagens;
bancos vetoriais.
7.10 Ferramentas chamadas

Para cada ferramenta utilizada pelo agente, o sistema deverá registrar:

nome da ferramenta;
descrição;
parâmetros enviados;
retorno;
duração;
status;
erro;
quantidade de tentativas;
ferramenta que originou a chamada;
agente responsável.

Exemplo:

{
  "tool": "buscar_clima",
  "input": {
    "cidade": "Uberlândia"
  },
  "output": {
    "temperatura": 27,
    "condicao": "Ensolarado"
  },
  "duration_ms": 382,
  "status": "success"
}
7.11 Registro de erros

O sistema deverá capturar:

mensagem do erro;
stack trace;
tipo do erro;
span de origem;
modelo ou ferramenta envolvida;
tentativa;
dados de entrada;
timestamp;
impacto na execução.

Categorias:

timeout;
autenticação;
limite de requisições;
resposta inválida;
erro de ferramenta;
erro do modelo;
falha de parsing;
indisponibilidade externa;
limite de tokens;
loop do agente;
erro interno.
7.12 Árvore de execução

A principal visualização do sistema será uma árvore interativa de execução.

Exemplo:

Atendimento do usuário — 4,8 s
│
├── Recuperar histórico — 82 ms
│
├── Buscar documentos — 430 ms
│   ├── Criar embedding — 118 ms
│   └── Consultar banco vetorial — 288 ms
│
├── Executar agente — 3,9 s
│   ├── Chamar modelo — 1,4 s
│   ├── Ferramenta consultar_pedido — 640 ms
│   └── Chamar modelo — 1,7 s
│
└── Formatar resposta — 112 ms

Cada nó deverá exibir:

nome;
tipo;
duração;
status;
tokens;
custo;
início e término;
erro, caso exista.

Ao clicar em um nó, o usuário visualizará os detalhes do span.

Recursos visuais
cores por tipo de operação;
destaque de erros;
duração proporcional;
expansão e recolhimento dos nós;
zoom;
pesquisa dentro da árvore;
visualização em árvore;
visualização em waterfall;
visualização em timeline.
7.13 Avaliação de resultados

A plataforma deverá permitir avaliações manuais e automáticas.

Avaliação manual

O usuário poderá classificar uma execução como:

positiva;
negativa;
neutra.

Também poderá fornecer uma nota de 1 a 5 e adicionar comentários.

Avaliação automática

Um modelo avaliador poderá analisar a resposta usando critérios como:

relevância;
precisão;
completude;
segurança;
clareza;
aderência às instruções;
presença de alucinação;
utilização correta das ferramentas.

Exemplo:

{
  "relevance": 0.92,
  "accuracy": 0.81,
  "clarity": 0.95,
  "hallucination_risk": 0.12
}
Tipos de avaliadores
regras determinísticas;
expressões regulares;
comparação exata;
comparação semântica;
LLM como avaliador;
avaliação humana;
código personalizado.
7.14 Dashboard principal

O dashboard deverá exibir:

número total de traces;
taxa de sucesso;
taxa de erro;
latência média;
latência P50, P95 e P99;
tokens utilizados;
custo estimado;
nota média;
quantidade de chamadas de ferramentas;
modelos mais utilizados;
ferramentas mais utilizadas;
erros mais frequentes.
Gráficos
traces por período;
custo por período;
tokens por período;
duração média;
taxa de erro;
avaliações;
uso por modelo;
uso por usuário;
uso por ambiente.
7.15 Página de traces

A página deverá apresentar uma tabela com:

horário;
nome;
status;
duração;
tokens;
custo;
modelo;
usuário;
avaliação;
ambiente.
Filtros
intervalo de data;
projeto;
ambiente;
status;
modelo;
provedor;
usuário;
duração;
quantidade de tokens;
custo;
avaliação;
presença de erro;
ferramenta chamada;
tags.
Busca

A pesquisa deverá permitir encontrar traces por:

conteúdo do prompt;
conteúdo da resposta;
ID;
usuário;
sessão;
nome de ferramenta;
mensagem de erro.
7.16 Comparação de traces

O usuário poderá selecionar dois traces e comparar:

prompts;
respostas;
modelo;
parâmetros;
duração;
tokens;
custo;
ferramentas;
avaliações;
árvore de execução.

Essa funcionalidade será útil para comparar versões diferentes de prompts ou agentes.

7.17 Gerenciamento de prompts

A plataforma poderá armazenar prompts versionados.

Dados:

nome;
descrição;
conteúdo;
variáveis;
versão;
autor;
data de criação;
status;
tags.

Funcionalidades:

criar versão;
publicar;
arquivar;
comparar versões;
realizar rollback;
associar prompt a traces;
acompanhar métricas por versão.

Exemplo de variável:

Você é um atendente da empresa {{company_name}}.

Responda à solicitação do cliente:
{{user_message}}
7.18 Sessões e usuários finais

O sistema deverá agrupar traces por sessão.

Isso permitirá acompanhar uma conversa completa:

Sessão do usuário
├── Mensagem 1
├── Mensagem 2
├── Mensagem 3
└── Mensagem 4

Dados do usuário final:

ID externo;
nome opcional;
metadados;
quantidade de sessões;
quantidade de traces;
custo gerado;
tokens utilizados;
última atividade.

Dados pessoais deverão ser opcionais e poderão ser anonimizados.

7.19 Alertas

O usuário poderá configurar alertas para condições como:

taxa de erro acima de 5%;
latência P95 acima de cinco segundos;
custo diário acima de determinado valor;
resposta com baixa avaliação;
aumento inesperado no consumo de tokens;
ferramenta falhando repetidamente;
modelo indisponível;
detecção de loop;
volume anormal de requisições.

Canais:

e-mail;
webhook;
Discord;
Slack;
Microsoft Teams.
7.20 Exportação

A plataforma deverá permitir exportar dados nos formatos:

JSON;
CSV;
JSON Lines.

Também poderá oferecer integração com:

Grafana;
Prometheus;
sistemas SIEM;
data warehouses;
ferramentas de análise.
8. Fluxo principal
Integração inicial
O usuário cria uma conta.
Cria uma organização.
Cria um projeto.
Seleciona o ambiente.
Gera uma chave de API.
Instala o SDK.
Configura a chave.
Executa sua aplicação.
Os traces aparecem no painel.

Exemplo de uso conceitual:

const trace = observer.startTrace({
  name: "customer-support-agent",
  userId: "user-123"
});

const llmSpan = trace.startSpan({
  name: "generate-response",
  type: "llm"
});

const response = await model.generate(prompt);

llmSpan.end({
  input: prompt,
  output: response.text,
  usage: response.usage
});

trace.end();
9. Requisitos funcionais
RF-01 — Autenticação

O sistema deverá permitir cadastro e login por e-mail e senha.

RF-02 — Organizações

O usuário deverá conseguir criar e gerenciar organizações.

RF-03 — Projetos

O sistema deverá permitir criar projetos e ambientes.

RF-04 — Chaves de API

O usuário deverá conseguir criar, revogar e rotacionar chaves de API.

RF-05 — Ingestão de eventos

O backend deverá receber traces e spans por API HTTP.

RF-06 — Compatibilidade com OpenTelemetry

O sistema deverá aceitar eventos no padrão OpenTelemetry.

RF-07 — Visualização de traces

O usuário deverá conseguir visualizar a execução completa de um agente.

RF-08 — Armazenamento de prompts

O sistema deverá armazenar prompts e mensagens associados às execuções.

RF-09 — Armazenamento de respostas

O sistema deverá armazenar respostas textuais e estruturadas.

RF-10 — Contabilização de tokens

O sistema deverá registrar tokens de entrada e saída.

RF-11 — Cálculo de custos

O sistema deverá calcular o custo estimado de cada execução.

RF-12 — Registro de ferramentas

O sistema deverá registrar ferramentas chamadas, parâmetros e resultados.

RF-13 — Registro de erros

O sistema deverá capturar erros e relacioná-los ao span correspondente.

RF-14 — Avaliação

O sistema deverá permitir avaliações manuais e automáticas.

RF-15 — Filtros

O usuário deverá conseguir filtrar traces por diferentes propriedades.

RF-16 — Pesquisa

O sistema deverá permitir pesquisar prompts, respostas e erros.

RF-17 — Dashboard

O sistema deverá gerar métricas agregadas.

RF-18 — Alertas

O sistema deverá enviar notificações quando limites configurados forem atingidos.

RF-19 — Exportação

O sistema deverá permitir exportar dados.

RF-20 — Retenção

A organização deverá poder definir por quanto tempo os dados serão armazenados.

10. Requisitos não funcionais
RNF-01 — Desempenho

A API de ingestão deverá responder rapidamente para não prejudicar a aplicação monitorada.

Meta inicial:

P95 inferior a 150 ms
RNF-02 — Processamento assíncrono

O processamento analítico deverá ocorrer de forma assíncrona.

A aplicação monitorada não deverá aguardar:

cálculo de custo;
agregação de métricas;
avaliações;
criação de alertas.
RNF-03 — Escalabilidade

O sistema deverá suportar aumento horizontal da API e dos workers.

RNF-04 — Disponibilidade

Falhas no sistema de observabilidade não poderão impedir o funcionamento da aplicação monitorada.

O SDK deverá utilizar uma estratégia fail-open.

RNF-05 — Segurança

Todos os dados deverão ser transmitidos com HTTPS.

RNF-06 — Isolamento

Dados de uma organização não poderão ser acessados por outra.

RNF-07 — Privacidade

O sistema deverá permitir:

mascaramento de campos;
exclusão de dados;
anonimização;
bloqueio do armazenamento de prompts;
regras personalizadas de sanitização.
RNF-08 — Confiabilidade

Eventos temporariamente não processados deverão poder ser reenviados.

RNF-09 — Idempotência

O envio repetido do mesmo evento não deverá gerar duplicações.

RNF-10 — Observabilidade interna

A própria plataforma deverá possuir logs, métricas e traces.

11. Arquitetura proposta
Aplicação do cliente
        │
        │ SDK / OpenTelemetry
        ▼
API de ingestão — Elysia + Bun
        │
        ├── Validação
        ├── Autenticação
        ├── Rate limiting
        └── Sanitização
        │
        ▼
Redis Streams / Filas
        │
        ▼
Workers de processamento
        │
        ├── Cálculo de tokens
        ├── Cálculo de custos
        ├── Agregação
        ├── Alertas
        └── Avaliações
        │
        ├─────────────────────┐
        ▼                     ▼
PostgreSQL               ClickHouse
Metadados e usuários     Eventos e análises
        │                     │
        └──────────┬──────────┘
                   ▼
              API de consulta
                   │
                   ▼
            Dashboard Next.js
12. Stack tecnológica
Frontend
Next.js

Responsável por:

dashboard;
autenticação;
visualização de traces;
filtros;
gerenciamento de projetos;
configuração de alertas;
visualização da árvore.

Bibliotecas possíveis:

TypeScript;
Tailwind CSS;
shadcn/ui;
TanStack Query;
TanStack Table;
React Flow;
Recharts;
Zod;
Zustand.
React Flow

Pode ser utilizado para montar a árvore de execução interativa.

Recharts

Pode ser utilizado para gráficos de:

custo;
tokens;
latência;
taxa de erro;
avaliações.
Backend
Bun

Runtime utilizado para executar a API e os workers.

Elysia

Framework principal do backend.

Responsabilidades:

API REST;
ingestão;
autenticação por chave;
consulta de traces;
gerenciamento de projetos;
webhooks;
integração com Redis.

Bibliotecas:

Elysia;
TypeBox ou Zod;
Drizzle ORM;
OpenTelemetry SDK;
Redis client.
Banco transacional
PostgreSQL

Responsável por:

usuários;
organizações;
membros;
projetos;
chaves de API;
permissões;
prompts;
configurações;
alertas;
feedbacks.
Banco analítico
ClickHouse

Responsável por armazenar grandes volumes de:

traces;
spans;
tokens;
custos;
eventos;
métricas;
logs.

O ClickHouse é recomendado para o projeto completo por permitir consultas analíticas rápidas em grandes volumes.

Para uma primeira versão, tudo poderá ser armazenado no PostgreSQL.

Redis

Responsável por:

filas;
cache;
rate limiting;
sessões temporárias;
processamento assíncrono;
deduplicação de eventos;
atualizações em tempo real.

Possíveis estruturas:

Redis Streams;
listas;
sorted sets;
pub/sub.
OpenTelemetry

Responsável pela padronização da coleta de traces e spans.

O sistema poderá aceitar:

OTLP via HTTP;
OTLP via gRPC;
SDK próprio;
API REST personalizada.
Docker

Serviços:

services:
  frontend:
  api:
  worker:
  postgres:
  clickhouse:
  redis:
  otel-collector:
13. Organização dos serviços

Uma estrutura inicial de monorepo:

agent-observability/
├── apps/
│   ├── web/
│   │   └── Next.js
│   │
│   ├── api/
│   │   └── Elysia
│   │
│   └── worker/
│       └── Bun workers
│
├── packages/
│   ├── database/
│   ├── sdk-node/
│   ├── sdk-python/
│   ├── shared/
│   ├── telemetry/
│   └── ui/
│
├── infrastructure/
│   ├── docker/
│   ├── clickhouse/
│   ├── postgres/
│   └── otel/
│
├── docker-compose.yml
└── package.json
14. Modelo de dados
Tabela users
id
name
email
password_hash
avatar_url
created_at
updated_at
Tabela organizations
id
name
slug
owner_id
plan
retention_days
created_at
updated_at
Tabela organization_members
organization_id
user_id
role
created_at
Tabela projects
id
organization_id
name
slug
description
environment
created_at
updated_at
Tabela api_keys
id
project_id
name
key_hash
key_prefix
expires_at
last_used_at
revoked_at
created_at
Tabela prompt_templates
id
project_id
name
description
current_version
created_at
updated_at
Tabela prompt_versions
id
prompt_template_id
version
content
variables
created_by
created_at
Tabela evaluations
id
trace_id
span_id
evaluator_type
evaluator_name
score
label
reason
metadata
created_at
15. Estrutura analítica no ClickHouse
Tabela traces
trace_id
project_id
organization_id
environment
name
status
start_time
end_time
duration_ms
input
output
user_id
session_id
model
provider
input_tokens
output_tokens
total_tokens
estimated_cost
tags
metadata
app_version
agent_version
prompt_version
Tabela spans
span_id
trace_id
parent_span_id
project_id
name
span_type
status
start_time
end_time
duration_ms
input
output
error_type
error_message
input_tokens
output_tokens
estimated_cost
model
provider
tags
metadata
Tabela tool_calls
tool_call_id
trace_id
span_id
tool_name
arguments
result
status
duration_ms
error_message
created_at
16. Endpoints da API
Autenticação por chave
Authorization: Bearer ags_live_xxxxx
Criar trace
POST /v1/traces
{
  "traceId": "trace_123",
  "name": "support-agent",
  "environment": "production",
  "userId": "user_456",
  "input": {
    "message": "Onde está meu pedido?"
  },
  "startedAt": "2026-06-20T18:00:00Z"
}
Finalizar trace
PATCH /v1/traces/:traceId
{
  "status": "success",
  "output": {
    "message": "Seu pedido está em transporte."
  },
  "endedAt": "2026-06-20T18:00:04Z"
}
Criar span
POST /v1/traces/:traceId/spans
Finalizar span
PATCH /v1/spans/:spanId
Envio em lote
POST /v1/batch

O envio em lote reduz a quantidade de requisições realizadas pelo SDK.

OTLP
POST /v1/otel/v1/traces
Consultar traces
GET /v1/projects/:projectId/traces
Consultar trace
GET /v1/traces/:traceId
Criar avaliação
POST /v1/traces/:traceId/evaluations
17. Segurança e privacidade
Dados sensíveis

Prompts podem conter:

nomes;
e-mails;
documentos;
endereços;
credenciais;
informações empresariais;
dados financeiros.

A plataforma deverá implementar sanitização antes do armazenamento.

Exemplo:

{
  "email": "ni***@gmail.com",
  "cpf": "***.***.***-**",
  "apiKey": "[REDACTED]"
}
Configurações por projeto
Armazenar prompts: sim/não
Armazenar respostas: sim/não
Mascarar e-mails: sim/não
Mascarar documentos: sim/não
Mascarar chaves: sempre
Retenção: 7, 30, 90 ou 365 dias
Armazenamento de chaves

As chaves de API nunca deverão ser armazenadas em texto puro.

Deverá ser armazenado apenas:

hash;
prefixo identificável;
últimos caracteres, quando necessário.
18. Detecção de loops

A plataforma poderá identificar possíveis loops quando:

a mesma ferramenta for chamada muitas vezes;
o mesmo prompt se repetir;
respostas muito semelhantes forem geradas;
a quantidade de etapas ultrapassar um limite;
o custo crescer rapidamente;
o trace ultrapassar determinada duração.

Exemplo de alerta:

Possível loop detectado

A ferramenta "buscar_produto" foi chamada 12 vezes
com os mesmos parâmetros dentro do mesmo trace.
19. Atualização em tempo real

A tela de detalhes deverá acompanhar traces em andamento.

Tecnologias possíveis:

Server-Sent Events;
WebSockets;
Redis Pub/Sub.

Fluxo:

Worker processa evento
        ↓
Publica atualização no Redis
        ↓
API recebe o evento
        ↓
Dashboard recebe atualização
        ↓
Novo nó aparece na árvore
20. SDKs
SDK Node.js

Primeiro SDK a ser desenvolvido.

Recursos:

criação de traces;
criação de spans;
wrappers para modelos;
envio em lote;
retry;
cache local;
mascaramento;
suporte a OpenTelemetry.
SDK Python

Poderá ser desenvolvido posteriormente para integração com:

LangChain;
LangGraph;
CrewAI;
AutoGen;
LlamaIndex;
aplicações FastAPI.
Integrações futuras
OpenAI;
Anthropic;
Google Gemini;
Vercel AI SDK;
LangChain;
LangGraph;
CrewAI;
Ollama;
modelos locais.
21. MVP

O MVP deverá focar no fluxo principal de observabilidade.

Funcionalidades do MVP
cadastro e login;
criação de organização;
criação de projeto;
geração de chave de API;
endpoint de ingestão;
registro de traces;
registro de spans;
registro de prompts e respostas;
tokens;
cálculo de custo;
registro de ferramentas;
registro de erros;
listagem de traces;
filtros básicos;
página detalhada do trace;
árvore de execução;
dashboard básico;
Docker Compose.
Banco do MVP

Para simplificar a primeira versão:

PostgreSQL + Redis

O ClickHouse poderá ser adicionado depois que a arquitetura principal estiver funcionando.

22. Funcionalidades posteriores ao MVP
Versão 1.1
atualização em tempo real;
avaliações manuais;
exportação CSV e JSON;
comparação de traces;
gerenciamento de membros;
webhooks.
Versão 1.2
avaliações automáticas;
alertas;
detecção de loops;
versionamento de prompts;
dashboard avançado;
integração OpenTelemetry completa.
Versão 2.0
ClickHouse;
SDK Python;
integração com frameworks;
replay de traces;
testes de regressão;
comparação de modelos;
experimentos A/B;
dashboards personalizados;
modo self-hosted completo.
23. Roadmap de desenvolvimento
Fase 1 — Fundação
monorepo;
Docker;
Next.js;
Elysia;
PostgreSQL;
Redis;
autenticação;
organizações e projetos.
Fase 2 — Ingestão
API keys;
endpoint de traces;
endpoint de spans;
envio em lote;
validação;
idempotência;
filas.
Fase 3 — Processamento
workers;
cálculo de duração;
tokens;
custo;
agregação;
tratamento de erros.
Fase 4 — Interface
dashboard;
tabela de traces;
filtros;
detalhes;
visualização de prompts;
visualização de ferramentas.
Fase 5 — Árvore de execução
React Flow;
hierarquia de spans;
painel de detalhes;
timeline;
waterfall;
atualização em tempo real.
Fase 6 — Avaliações
feedback manual;
critérios;
LLM como avaliador;
dashboards de qualidade.
Fase 7 — Escala
ClickHouse;
particionamento;
retenção;
agregações;
monitoramento da própria plataforma.
24. Critérios de aceitação do MVP

O MVP será considerado funcional quando:

um usuário conseguir criar um projeto;
o projeto gerar uma chave de API;
uma aplicação externa conseguir enviar um trace;
o trace puder conter múltiplos spans;
prompts e respostas forem exibidos;
tokens forem contabilizados;
custos forem estimados;
ferramentas chamadas forem exibidas;
erros forem relacionados à etapa correta;
a árvore representar a hierarquia real da execução;
o dashboard mostrar métricas básicas;
os traces puderem ser filtrados;
todos os serviços iniciarem com Docker Compose.
25. Métricas de sucesso
Métricas técnicas
tempo médio de ingestão;
eventos processados por segundo;
taxa de eventos perdidos;
tempo médio de consulta;
disponibilidade da API;
consumo de armazenamento.
Métricas de produto
quantidade de projetos criados;
traces recebidos por dia;
usuários ativos;
quantidade de investigações realizadas;
alertas resolvidos;
avaliações registradas;
tempo médio para encontrar um erro.
Metas iniciais
API de ingestão P95: < 150 ms
Dashboard P95: < 1,5 s
Taxa de eventos processados: > 99,9%
Disponibilidade: > 99,5%
26. Diferenciais do projeto

O projeto se destacará no portfólio por demonstrar conhecimentos em:

sistemas distribuídos;
arquitetura orientada a eventos;
telemetria;
OpenTelemetry;
agentes de IA;
análise de custos de LLM;
processamento assíncrono;
bancos analíticos;
filas;
visualização de dados;
segurança;
multi-tenancy;
SDKs;
Docker;
aplicações em tempo real.

Não será apenas um CRUD. Será uma plataforma com problemas reais de engenharia, escalabilidade, processamento e visualização.

27. Exemplo de demonstração para o portfólio

Uma aplicação de atendimento com agente de IA poderá ser conectada ao AgentScope.

O usuário pergunta:

Onde está meu pedido?

No painel aparecerá:

Trace: support-agent
Status: sucesso
Duração: 4,2 segundos
Tokens: 1.842
Custo: US$ 0,0084
Avaliação: 4,7/5

Árvore:

support-agent
├── carregar-histórico
├── chamar-modelo
├── consultar-pedido
│   └── requisição-api
├── chamar-modelo
└── gerar-resposta

Ao clicar em consultar-pedido, será possível visualizar:

{
  "input": {
    "orderId": "10482"
  },
  "output": {
    "status": "in_transit",
    "estimatedDelivery": "2026-06-22"
  },
  "duration": 420
}

Essa demonstração torna o projeto fácil de entender visualmente e mostra claramente seu valor técnico.

28. Resumo da primeira versão

A primeira versão deverá utilizar:

Frontend: Next.js + TypeScript + Tailwind + shadcn/ui
Backend: Bun + Elysia
ORM: Drizzle
Banco: PostgreSQL
Fila e cache: Redis
Tracing: OpenTelemetry
Visualização: React Flow + Recharts
Infraestrutura: Docker Compose

Arquitetura inicial:

Aplicação externa
      ↓
API de ingestão
      ↓
Redis Streams
      ↓
Worker
      ↓
PostgreSQL
      ↓
Dashboard