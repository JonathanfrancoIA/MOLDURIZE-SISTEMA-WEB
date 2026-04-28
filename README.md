# MOLDURIZE WEB

> Plataforma SaaS de otimização de corte de EPS (isopor) — Nesting 2D + G-Code CNC + gestão de retalhos.

Transforma o aplicativo desktop Python de nesting num produto web completo: fila de peças, algoritmo MaxRects + BFF, visualização interativa tipo AutoCAD (Konva.js), exportação de G-Code para Mach3/PlanetCNC/GRBL, histórico persistente, faturamento Stripe, autenticação Clerk.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                       MOLDURIZE WEB                             │
└─────────────────────────────────────────────────────────────────┘

 ┌────────────────┐      ┌──────────────────┐     ┌────────────┐
 │  Next.js 14    │──────│   FastAPI        │─────│ PostgreSQL │
 │  (apps/web)    │ HTTP │   (apps/api)     │     │            │
 │  :3000         │      │   :8001          │     │  :5432     │
 └────────────────┘      └──────────────────┘     └────────────┘
        │                        │                       │
        │                        │                       │
     Clerk Auth             Nesting Engine         SQLAlchemy
     Stripe Checkout        G-Code Generator       Alembic
     Konva Canvas           Stripe Webhooks        Redis (Celery)
```

### Estrutura do monorepo

```
MOLDURIZE WEB/
├── apps/
│   ├── api/              FastAPI backend (Python 3.11+)
│   │   ├── routers/        Health, nesting, gcode, remnants, billing, webhooks
│   │   ├── db/             SQLAlchemy models + CRUD + Alembic migrations
│   │   ├── tests/          pytest — 24 tests, all passing
│   │   ├── engine.py       Core nesting algorithm (MaxRects + BFF)
│   │   ├── processor.py    G-Code generator (4-axis, multi-profile)
│   │   └── main.py         FastAPI app entry point
│   │
│   └── web/              Next.js 14 frontend (TypeScript, App Router)
│       ├── src/app/        Pages: /, /pricing, /sign-{in,up},
│       │                   /dashboard, /nesting, /remnants, /history, /settings
│       ├── src/components/ NestingCanvas (Konva)
│       ├── src/lib/        Typed API client instance
│       └── src/middleware.ts Clerk route protection
│
├── packages/
│   ├── shared/           @moldurize/shared — Types + typed API client
│   └── ui/               @moldurize/ui — Reusable React components
│
├── .github/workflows/    CI/CD (lint + pytest + next build, Railway + Vercel)
├── docker-compose.yml    Local stack (db + redis + api + web)
├── Makefile              Dev commands (make dev, make test, …)
└── turbo.json            Turborepo pipeline
```

---

## Quickstart (dev local)

### 1. Pré-requisitos

- **Node.js** 20+ e **pnpm** 10+
- **Python** 3.11+
- **PostgreSQL** 16 (opcional — modo dev roda em memória)
- **Docker Desktop** (opcional — para stack completa)

### 2. Instalação

```bash
# Clonar e instalar
git clone <repo>
cd "MOLDURIZE WEB"

# Frontend + pacotes compartilhados
pnpm install

# Backend
cd apps/api
pip install -r requirements.txt
cd ../..
```

### 3. Variáveis de ambiente

**Frontend** — `apps/web/.env.local`:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_API_URL=http://localhost:8001
```

**Backend** — `apps/api/.env` (copiar de `.env.example`):
```env
ENVIRONMENT=development
# DATABASE_URL=postgresql://moldurize:moldurize_dev@localhost:5432/moldurize  # opcional
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
CLERK_WEBHOOK_SECRET=whsec_...
```

### 4. Obter chaves

| Serviço | Onde obter | Variáveis |
|---------|-----------|-----------|
| **Clerk** | [dashboard.clerk.com](https://dashboard.clerk.com) → API keys | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` |
| **Clerk Webhook** | Clerk → Webhooks → Add endpoint | `CLERK_WEBHOOK_SECRET` |
| **Stripe** | [dashboard.stripe.com](https://dashboard.stripe.com) → API keys | `STRIPE_SECRET_KEY` |
| **Stripe Webhook** | Stripe → Developers → Webhooks | `STRIPE_WEBHOOK_SECRET` |
| **Stripe Prices** | Stripe → Products → criar 3 produtos (Starter/Pro/Enterprise) | `STRIPE_PRICE_*` |

### 5. Rodar

**Opção A — Makefile:**
```bash
make dev-api    # Em um terminal  — http://localhost:8001
make dev-web    # Em outro terminal — http://localhost:3000
```

**Opção B — Turborepo:**
```bash
pnpm dev
```

**Opção C — Docker (stack completa com DB e Redis):**
```bash
docker compose up -d
```

### 6. Verificar

- Frontend: http://localhost:3000
- API docs: http://localhost:8001/docs
- Health check: http://localhost:8001/health

---

## Comandos principais (Makefile)

```bash
make install         # Instala tudo (pnpm + pip)
make dev             # Frontend + API concorrente
make dev-api         # Só o backend
make dev-web         # Só o frontend
make build           # Build produção do Next
make test            # pytest + next lint (24 testes backend + lint frontend)
make lint            # Só lint
make db-up           # Sobe PostgreSQL via docker
make db-migrate      # alembic upgrade head
make db-revision m="msg"   # Cria migração a partir do schema atual
make docker-up       # Stack docker completa
make docker-logs     # Tail dos logs
make clean           # Remove caches e node_modules
```

---

## Banco de Dados

### Setup inicial (local)

```bash
docker compose up -d db
cd apps/api
alembic upgrade head
```

### Criar nova migração

```bash
# 1. Editar apps/api/db/schema.py
# 2. Gerar migração:
cd apps/api
alembic revision --autogenerate -m "add foo to bar"

# 3. Revisar o arquivo gerado em db/migrations/versions/
# 4. Aplicar:
alembic upgrade head
```

### Schema principal

- **`users`** — Clerk ID, email, plan tier, Stripe IDs, nesting count
- **`nestings`** — Job de corte: parts input (JSON), resultados, placed_parts (JSON)
- **`remnants`** — Retalhos de EPS com status disponível/descartado

---

## API (FastAPI)

Todas as rotas sob `/api/v1/` exceto `/health`. Docs interativas em `/docs`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Liveness probe |
| POST | `/api/v1/optimize` | Gera nesting — retorna peças posicionadas + stats |
| GET | `/api/v1/nestings` | Lista histórico do usuário (requer DB) |
| GET | `/api/v1/nestings/{id}` | Detalhes de um nesting |
| POST | `/api/v1/gcode` | Gera G-Code (JSON) |
| POST | `/api/v1/gcode/download` | G-Code como download .nc |
| GET/POST/PATCH/DELETE | `/api/v1/remnants[/{id}]` | CRUD de retalhos |
| GET | `/api/v1/billing/plans` | Planos disponíveis |
| POST | `/api/v1/billing/checkout` | Cria sessão Stripe Checkout |
| POST | `/api/v1/billing/portal` | Portal do cliente Stripe |
| POST | `/api/v1/webhooks/clerk` | Clerk auth events (HMAC verified) |
| POST | `/api/v1/webhooks/stripe` | Stripe billing events (HMAC verified) |

### Frontend — usar o API client tipado

```typescript
import { api } from "@/lib/api";

// Rodar nesting
const result = await api.optimize({
  parts: [{ width: 500, height: 300, quantity: 4 }],
  block: { width: 4000, height: 1200, kerf: 3.0 },
});

// Listar retalhos disponíveis
const remnants = await api.listRemnants("disponivel");

// Criar sessão de checkout
const { checkout_url } = await api.createCheckout({ plan: "pro" });
window.location.href = checkout_url;
```

---

## Testes

```bash
cd apps/api
pytest -v              # Roda todos os 24 testes
pytest --cov=.         # Com coverage
```

Cobertura atual:
- `test_health.py` — 2 testes
- `test_nesting.py` — 8 testes (incluindo 50-piece stress test)
- `test_gcode.py` — 7 testes (Mach3 + PlanetCNC profiles)
- `test_remnants.py` — 7 testes (CRUD + filtros + validação)

---

## Deploy

### Vercel (frontend)

```bash
# vercel.json detecta Next.js automaticamente
vercel --prod

# Configurar no dashboard:
# - Root Directory: apps/web
# - Build Command: pnpm build
# - Install Command: pnpm install
# - Environment Variables: todas as NEXT_PUBLIC_* + CLERK_SECRET_KEY
```

### Railway (backend)

```bash
railway up                   # Sobe a partir de apps/api/Dockerfile
railway run alembic upgrade head   # Roda migrações
```

Configurar no Railway:
- Todas as variáveis do `apps/api/.env.example`
- `DATABASE_URL` apontando para o PostgreSQL do Railway
- `CORS_ORIGINS=https://seu-dominio.vercel.app`

### CI/CD

- `.github/workflows/ci.yml` — lint + pytest + next build em cada PR
- `.github/workflows/deploy.yml` — deploy automático na main

---

## Planos e limites

| Plano | Preço/mês | Nestings | Blocos | Features |
|-------|-----------|----------|--------|----------|
| **Free** | R$ 0 | 5 | 1 | G-Code básico |
| **Starter** | R$ 97 | 50 | 5 | + Gestão de retalhos |
| **Pro** | R$ 197 | ∞ | ∞ | + DXF, IA, multi-perfil |
| **Enterprise** | R$ 497 | ∞ | ∞ | + SSO, API, ERP, SLA |

---

## Troubleshooting

**Frontend retorna 500 em toda rota:**
- Verifique se as chaves do Clerk em `.env.local` são reais (começam com `pk_test_` ou `pk_live_` e são base64 válido, não `SUBSTITUA`).

**API retorna "connection refused":**
- Confirme que o backend está rodando na porta 8001 (`make dev-api`).
- Se tiver outro processo ocupando 8001, libere: `netstat -ano | grep 8001` → `taskkill /F /PID <pid>`.

**Konva crash no build:**
- Já resolvido em `next.config.mjs` com `externals: ["canvas"]` e `dynamic(..., { ssr: false })`.

**Erro `atob()` invalid base64:**
- Chaves Clerk placeholder. Substituir em `.env.local` por chaves reais de [dashboard.clerk.com](https://dashboard.clerk.com).

---

## Licença

Proprietária — © 2026 MOLDURIZE.
