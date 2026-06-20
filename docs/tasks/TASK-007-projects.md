# TASK-007 — Implementar projetos e configurações

**Status:** pending  
**Dependências:** TASK-006

## Objetivo

Permitir criar, editar, selecionar e arquivar projetos dentro de uma organização.

## Escopo

- Implementar nome, slug, descrição, ambiente padrão e datas.
- Implementar configurações de retenção e captura de dados.
- Validar unicidade de slug no escopo correto.
- Criar páginas e APIs de gestão de projetos.
- Aplicar soft delete ao arquivamento.

## Critérios de aceite

- Projetos podem ser criados, atualizados, selecionados e arquivados.
- Projetos arquivados não recebem novas chaves por padrão.
- Configurações de captura e retenção ficam disponíveis para ingestão.
- A autorização é validada por organização e papel.

## Testes

- CRUD, slug duplicado, arquivamento e acesso cruzado.
- Estados vazio, loading e erro na interface.
