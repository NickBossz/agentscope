# AgentScope — Product Requirements Document

## 1. Product Overview

AgentScope is an observability platform for AI agents. It helps developers inspect, monitor, debug, and improve AI-powered applications by collecting and visualizing prompts, model responses, execution time, token usage, estimated cost, tool calls, errors, evaluations, and the complete execution tree of each agent run.

## 2. Problem Statement

AI agent applications are difficult to debug because a single user request may trigger multiple model calls, tool executions, retries, database queries, and background operations.

Traditional logs usually fail to clearly show:

- which prompt was sent to the model;
- which response was returned;
- why a tool was called;
- where an error happened;
- how much the execution cost;
- how many tokens were consumed;
- which step caused high latency;
- how the final response was produced.

AgentScope solves this by representing every agent execution as a trace composed of nested spans.

## 3. Goals

### Primary goal

Provide a centralized control panel for monitoring and debugging AI agents.

### Secondary goals

- Reduce the time required to investigate failures.
- Identify slow or expensive execution steps.
- Compare prompt, model, and agent versions.
- Track token usage and estimated costs.
- Detect repeated or unnecessary tool calls.
- Evaluate the quality of agent responses.
- Make complex agent workflows easy to understand visually.

## 4. Non-Goals for the MVP

The MVP will not include:

- a full prompt playground;
- production billing and subscription management;
- advanced enterprise SSO;
- custom dashboard builders;
- full support for every AI framework;
- automatic prompt optimization;
- multi-region infrastructure;
- native mobile applications.

## 5. Target Users

### AI developers

Need to inspect prompts, responses, errors, tool calls, and execution paths.

### Machine learning engineers

Need to compare models, prompts, parameters, costs, and quality scores.

### Product and engineering teams

Need visibility into reliability, latency, usage, and cost.

### Students and researchers

Need to understand and demonstrate the internal behavior of AI agents.

## 6. Core Concepts

### Organization

A workspace that contains members and projects.

### Project

An AI application monitored by AgentScope.

### Environment

The execution environment of a project, such as development, staging, or production.

### Trace

A complete execution of an AI agent, usually triggered by a user request or background task.

### Span

An individual operation inside a trace, such as an LLM call, tool call, database query, retrieval step, or evaluation.

### Evaluation

A manual or automatic assessment of a trace or span.

## 7. MVP Scope

The MVP must include:

1. User authentication.
2. Organization creation.
3. Project creation.
4. API key generation and revocation.
5. Trace ingestion API.
6. Span ingestion API.
7. Batch event ingestion.
8. Prompt and response storage.
9. Token usage tracking.
10. Estimated cost calculation.
11. Tool call tracking.
12. Error tracking.
13. Trace list with filters.
14. Trace detail page.
15. Execution tree visualization.
16. Basic analytics dashboard.
17. Docker-based local development environment.

## 8. Functional Requirements

### FR-01 — Authentication

Users must be able to sign up, sign in, sign out, and access protected pages.

### FR-02 — Organizations

Users must be able to create an organization and invite or add members in future versions.

Roles planned:

- owner;
- admin;
- developer;
- viewer.

### FR-03 — Projects

Users must be able to create, update, archive, and select projects.

Each project must contain:

- name;
- slug;
- description;
- organization ID;
- default environment;
- retention settings;
- data capture settings;
- creation date.

### FR-04 — API Keys

Users must be able to create, list, revoke, and rotate API keys.

Requirements:

- Never store raw API keys.
- Store only a secure hash and an identifiable prefix.
- Show the full key only once after creation.
- Allow environment-specific keys.

### FR-05 — Trace Ingestion

The backend must accept trace events through an authenticated HTTP API.

A trace should support:

- trace ID;
- project ID;
- name;
- environment;
- status;
- start and end timestamps;
- duration;
- input;
- output;
- user ID;
- session ID;
- model;
- provider;
- token usage;
- estimated cost;
- tags;
- metadata;
- application version;
- agent version;
- prompt version.

### FR-06 — Span Ingestion

A trace must contain one or more spans.

Supported span types:

- agent;
- LLM;
- tool;
- retrieval;
- embedding;
- reranking;
- database;
- HTTP request;
- code execution;
- evaluation;
- custom.

Each span must support:

- span ID;
- trace ID;
- parent span ID;
- name;
- type;
- status;
- start and end timestamps;
- duration;
- input;
- output;
- error information;
- model information;
- token usage;
- estimated cost;
- tags;
- metadata.

### FR-07 — Batch Ingestion

The API must support batch ingestion to reduce network overhead.

The endpoint must:

- validate all events;
- reject malformed events with useful errors;
- support idempotency;
- enqueue valid events for asynchronous processing.

### FR-08 — Prompts and Responses

The system must store and display:

- system messages;
- developer messages;
- user messages;
- assistant messages;
- tool messages;
- model parameters;
- response content;
- structured output;
- finish reason.

Projects must be able to disable prompt or response storage.

### FR-09 — Token Usage

The system must track:

- input tokens;
- output tokens;
- cached tokens;
- reasoning tokens when available;
- total tokens.

### FR-10 — Cost Estimation

The system must estimate cost using provider and model pricing data.

Cost must be available by:

- trace;
- span;
- project;
- model;
- provider;
- environment;
- time range.

Pricing definitions must be configurable.

### FR-11 — Tool Calls

The system must capture:

- tool name;
- arguments;
- result;
- duration;
- status;
- retry count;
- error details.

### FR-12 — Errors

The system must capture:

- error type;
- error message;
- stack trace when available;
- affected trace and span;
- provider or tool involved;
- retry number;
- timestamp.

Common error categories:

- timeout;
- authentication;
- rate limit;
- provider error;
- invalid response;
- parsing failure;
- tool failure;
- context limit;
- agent loop;
- internal error.

### FR-13 — Trace List

The trace list must display:

- start time;
- trace name;
- status;
- duration;
- model;
- total tokens;
- estimated cost;
- user ID;
- environment;
- evaluation score.

Supported filters:

- project;
- environment;
- date range;
- status;
- model;
- provider;
- user ID;
- session ID;
- minimum and maximum duration;
- minimum and maximum cost;
- error presence;
- tool name;
- tags.

### FR-14 — Trace Details

The trace detail page must show:

- trace summary;
- input and output;
- token usage;
- estimated cost;
- duration;
- status;
- tags and metadata;
- execution tree;
- chronological timeline;
- spans;
- tool calls;
- errors;
- evaluations.

### FR-15 — Execution Tree

The execution tree must visually represent parent-child relationships between spans.

Each node must display:

- name;
- type;
- status;
- duration;
- tokens;
- cost.

Users must be able to:

- expand and collapse nodes;
- select a node;
- inspect span details;
- identify failed nodes;
- zoom and pan;
- switch between tree and waterfall views in future versions.

### FR-16 — Dashboard

The dashboard must display:

- total traces;
- successful traces;
- failed traces;
- success rate;
- average latency;
- P50, P95, and P99 latency;
- total tokens;
- estimated cost;
- most-used models;
- most-used tools;
- most common errors.

Charts must support a selectable time range.

### FR-17 — Evaluations

The MVP should support manual feedback with:

- positive, negative, or neutral label;
- optional score;
- optional comment.

Automatic evaluations are planned for a later version.

### FR-18 — Data Export

A later version should support trace export as JSON, JSONL, and CSV.

## 9. Non-Functional Requirements

### NFR-01 — Performance

The ingestion API should target a P95 response time below 150 ms under normal development load.

### NFR-02 — Asynchronous Processing

Expensive work must not block ingestion, including:

- cost calculation;
- aggregation;
- alerts;
- evaluations;
- analytics updates.

### NFR-03 — Reliability

The observability SDK must fail open. AgentScope failures must never break the monitored application.

### NFR-04 — Idempotency

Repeated events with the same event ID must not create duplicates.

### NFR-05 — Multi-Tenancy

All data access must be scoped by organization and project.

### NFR-06 — Security

- Use HTTPS in production.
- Hash secrets and API keys.
- Validate all external input.
- Apply rate limiting.
- Enforce authorization on every protected resource.
- Avoid logging secrets.

### NFR-07 — Privacy

Projects must support:

- disabling prompt storage;
- disabling response storage;
- configurable field redaction;
- retention policies;
- deletion of stored data.

### NFR-08 — Scalability

The API and workers must be horizontally scalable.

### NFR-09 — Observability

AgentScope must instrument its own API, workers, database calls, queues, and errors using OpenTelemetry.

## 10. Technical Architecture

### Frontend

- Next.js;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- TanStack Query;
- TanStack Table;
- React Flow;
- Recharts;
- Zod.

### Backend

- Bun;
- Elysia;
- TypeScript;
- Drizzle ORM;
- OpenTelemetry SDK.

### Data

MVP:

- PostgreSQL for transactional and trace data;
- Redis for queues, caching, rate limiting, and event deduplication.

Later:

- ClickHouse for high-volume analytical trace and span storage.

### Infrastructure

- Docker;
- Docker Compose;
- OpenTelemetry Collector.

## 11. Suggested Monorepo Structure

```text
agentscope/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── database/
│   ├── sdk-node/
│   ├── telemetry/
│   ├── shared/
│   └── ui/
├── infrastructure/
│   ├── docker/
│   ├── postgres/
│   ├── redis/
│   └── otel/
├── docs/
├── docker-compose.yml
├── package.json
├── PRD.md
└── AGENTS.md
```

## 12. Core Data Model

### PostgreSQL entities

- users;
- organizations;
- organization_members;
- projects;
- api_keys;
- traces;
- spans;
- tool_calls;
- evaluations;
- model_prices;
- project_settings.

### Important relationships

- An organization has many projects.
- A project has many API keys.
- A project has many traces.
- A trace has many spans.
- A span may have one parent span.
- A trace or span may have many evaluations.

## 13. API Overview

```text
POST   /v1/traces
PATCH  /v1/traces/:traceId
POST   /v1/traces/:traceId/spans
PATCH  /v1/spans/:spanId
POST   /v1/batch
POST   /v1/otel/v1/traces
GET    /v1/projects/:projectId/traces
GET    /v1/traces/:traceId
POST   /v1/traces/:traceId/evaluations
```

All ingestion endpoints must authenticate using a project API key.

## 14. Main User Flow

1. User creates an account.
2. User creates an organization.
3. User creates a project.
4. User generates an API key.
5. User installs or configures the AgentScope SDK.
6. The monitored application sends traces and spans.
7. AgentScope processes events asynchronously.
8. The trace appears in the dashboard.
9. The user opens the execution tree.
10. The user inspects prompts, responses, tool calls, duration, cost, and errors.

## 15. MVP Acceptance Criteria

The MVP is complete when:

- A user can authenticate.
- A user can create an organization and project.
- A project can generate an API key.
- An external application can send a trace.
- A trace can contain nested spans.
- Duplicate events are not stored twice.
- Prompts and responses are visible when capture is enabled.
- Token counts and estimated costs are displayed.
- Tool calls and errors are linked to the correct span.
- The trace list can be filtered.
- The trace detail page displays an execution tree.
- The dashboard displays basic aggregate metrics.
- The entire local environment starts with Docker Compose.

## 16. Delivery Phases

### Phase 1 — Foundation

- monorepo;
- Docker Compose;
- authentication;
- PostgreSQL;
- Redis;
- organizations;
- projects;
- API keys.

### Phase 2 — Ingestion

- trace endpoints;
- span endpoints;
- batch endpoint;
- validation;
- idempotency;
- Redis queue;
- worker processing.

### Phase 3 — Trace Explorer

- trace list;
- filters;
- trace detail page;
- prompt and response viewer;
- error viewer;
- tool call viewer.

### Phase 4 — Visualization

- execution tree;
- node details;
- duration indicators;
- status indicators;
- trace timeline.

### Phase 5 — Analytics

- dashboard;
- latency percentiles;
- token and cost charts;
- model and tool usage metrics.

### Phase 6 — Advanced Features

- automatic evaluations;
- alerts;
- loop detection;
- ClickHouse;
- SDK for Python;
- framework integrations;
- trace comparison;
- prompt versioning.

## 17. Success Metrics

Technical metrics:

- ingestion API P95 below 150 ms;
- more than 99.9% of accepted events processed;
- dashboard P95 below 1.5 seconds for common queries;
- no cross-tenant data exposure;
- no duplicate events when idempotency keys are reused.

Product metrics:

- traces ingested per day;
- active projects;
- active users;
- average traces inspected per user;
- percentage of failed traces investigated;
- average time to identify the failing span.

## 18. Product Principles

- Observability must not break the monitored application.
- Every execution must be understandable.
- The interface must make complex traces visually simple.
- Sensitive data must be optional, protected, and removable.
- The architecture must start simple and remain migration-friendly.
- The MVP should use PostgreSQL before introducing ClickHouse complexity.
