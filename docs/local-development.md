# Local Development

Este guia define o caminho minimo para rodar o MOLDURIZE WEB com persistencia real.

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
MVP_DEV_MODE=true
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
