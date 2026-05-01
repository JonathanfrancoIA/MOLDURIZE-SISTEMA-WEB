# Local Development

Este guia define o caminho minimo para rodar o MOLDURIZE WEB com persistencia real.

## MVP operacional de 2026-05-01

Para a entrega operacional, login individual real exige:

- `MVP_DEV_MODE=false` no backend.
- `CLERK_ISSUER_URL` real do projeto Clerk.
- `DATABASE_URL` apontando para Postgres real e acessivel.
- Migrations aplicadas e `/health/db` retornando conexao ok.

Stripe, Redis e Cloudflare R2 sao opcionais para este MVP operacional. Nao bloqueie o smoke manual por checkout, portal de billing, webhooks pagos, fila Celery, upload DXF ou arquivo permanente de G-Code.

## Portas padrao

- Web: `http://localhost:3000`
- API: `http://localhost:8001`
- API docs: `http://localhost:8001/docs`
- Postgres local: `localhost:5432`

## Banco local com Docker

Use este caminho quando Docker estiver disponivel na maquina.

```powershell
make db-up
```

Configure `apps/api/.env`:

```env
ENVIRONMENT=development
MVP_DEV_MODE=false
CLERK_ISSUER_URL=https://<your-clerk-instance>.clerk.accounts.dev
DATABASE_URL=postgresql://moldurize:moldurize_dev@localhost:5432/moldurize
```

Depois aplique migrations:

```powershell
make db-migrate
```

Valide a API e o banco:

```powershell
make dev-api
```

Em outro terminal:

```powershell
curl http://localhost:8001/health
curl http://localhost:8001/health/db
curl http://localhost:8001/api/v1/me
```

`/health/db` deve retornar `status: "ok"` e `database.connected: true`.

## Banco hosted

Use este caminho quando Docker nao estiver disponivel.

1. Crie ou escolha um Postgres acessivel pela maquina local.
2. Configure `apps/api/.env` com o `DATABASE_URL` real.
3. Rode `make db-migrate`.
4. Valide `/health/db`.

Nao use `DATABASE_URL` placeholder em smoke test. Se o host nao resolver DNS ou a conexao falhar, o MVP ainda nao esta provando persistencia real.

## Web local

Configure `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
```

Depois rode:

```powershell
make dev-web
```

## Checklist A/B de login e isolamento

Use dois usuarios reais do Clerk, Usuario A e Usuario B, com `MVP_DEV_MODE=false`.

1. Abrir `http://localhost:3000/sign-in` e entrar como Usuario A.
2. Confirmar que `/dashboard`, `/nesting`, `/history` e `/remnants` carregam sem modo anonimo/dev.
3. Criar um nesting como Usuario A e confirmar que aparece no History.
4. Criar um retalho como Usuario A e confirmar que aparece em Remnants.
5. Sair do Usuario A.
6. Entrar como Usuario B em uma sessao limpa ou navegador separado.
7. Confirmar que Usuario B nao ve history, nesting salvo ou retalhos do Usuario A.
8. Criar um nesting e um retalho como Usuario B.
9. Voltar ao Usuario A e confirmar que os dados de Usuario B nao aparecem.
10. Validar que `/api/v1/me` retorna o usuario logado correto em cada sessao.

## Smoke manual do MVP

Com API, web e banco rodando:

1. Abrir `http://localhost:3000/dashboard`.
2. Rodar um nesting em `http://localhost:3000/nesting`.
3. Confirmar que o uso mensal incrementou no dashboard ou settings.
4. Abrir `http://localhost:3000/history`.
5. Clicar em `Ver` no job salvo.
6. Confirmar que o canvas reabre com as pecas salvas.
7. Gerar ou baixar G-Code.
8. Criar um retalho em `http://localhost:3000/remnants`.
9. Alterar o status do retalho.
10. Remover o retalho.

## Gates antes de push

```powershell
cd apps/api
python -m pytest -q
cd ..\..
pnpm lint
pnpm build
```

Todos devem passar antes de abrir PR ou alterar a branch principal.
