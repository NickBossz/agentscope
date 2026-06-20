# TASK-005 — Implementar autenticação de usuários

**Status:** pending  
**Dependências:** TASK-002, TASK-004

## Objetivo

Permitir cadastro, login, logout e acesso seguro a páginas e APIs protegidas.

## Escopo

- Implementar criação de conta e sessão.
- Configurar cookies seguros para produção.
- Proteger rotas web e endpoints de dashboard.
- Validar redirects e proteger mutações contra CSRF.
- Criar telas de cadastro, login e estados de erro.

## Critérios de aceite

- Usuário pode criar conta, entrar e sair.
- Sessões inválidas ou expiradas são rejeitadas.
- Rotas protegidas não dependem apenas de ocultação na interface.
- Cookies usam configurações seguras adequadas ao ambiente.
- Erros não expõem stack traces ou credenciais.

## Testes

- Integração de cadastro, login, logout e proteção de rota.
- Casos de credenciais inválidas, sessão expirada e redirect inseguro.
