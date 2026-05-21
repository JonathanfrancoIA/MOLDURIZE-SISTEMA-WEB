# MOLDURIZE WEB — Master Roadmap (Launch sem Erro)

> **Documento canônico.** Substitui a leitura paralela de `next-steps-mvp.md`,
> `continuity-meeting-2026-04-29.md`, `ops-launch-meeting-2026-04-30.md` e
> `docs/PLAN-end-to-end.md`. Aqueles ficam como **histórico**; este aqui é o
> **executável**.
>
> Atualizado em 2026-05-04 após inventário completo do repositório.

---

## 1. Estado real do repositório (não suposição)

### 1.1 O que JÁ EXISTE e funciona

| Camada | Itens prontos |
|---|---|
| Git | 5 commits, baseline em `611036e feat: initial MOLDURIZE WEB commit`. Lock stale apenas em subrepo `.agent/devfoam-reference/.git/` (não bloqueia repo principal). |
| Backend (apps/api) | 8 routers (1.411 linhas): `nesting`, `gcode`, `remnants`, `health`, `webhooks`, `billing`, `users`. Engine `engine.py` + `processor.py` + `true_shape.py` + `gcode_generator.py`. Auth dependency `get_current_user_clerk_id`. Alembic configurado. |
| Backend tests | 1.205 linhas em 9 arquivos. Inclui `test_billing_flow.py` (165 linhas, 4 testes — checkout vinculado ao token, 400 sem price configurado, portal pega customer do DB, 400 sem customer). `test_user_isolation_flow.py` (157 linhas), `test_account_plan_flow.py` (234 linhas). |
| Frontend (apps/web) | Páginas: Dashboard, Nesting, History, Remnants, Settings, Pricing, sign-in, sign-up. Middleware Clerk. `api.ts` re-exportando `@moldurize/shared`. Canvas com Konva. |
| Shared (`@moldurize/shared`) | `createApiClient`, types completos (`NestingSummary`, `NestingStatus`, etc). |
| Docs | 4 docs de planejamento na agência + PLAN-end-to-end + local-development. |
| Infra | docker-compose.yml, Makefile, .env.example, .github/. |

### 1.2 O que está QUEBRADO ou INCOMPLETO (do mais crítico ao menos)

#### P0 — Bloqueadores de launch

| # | Problema | Evidência | Fica em |
|---|---|---|---|
| P0-1 | `DATABASE_URL` não conecta — Supabase host não resolve DNS local. | continuity-meeting §"Estado Atual"; .env aponta pra host inacessível. | **Sprint 0** |
| P0-2 | Enum mismatch SQLAlchemy uppercase vs Alembic lowercase em Postgres real. | continuity-meeting §P0-2. | **Sprint 0** |
| P0-3 | Startup usa `create_all()` quando `DATABASE_URL` existe — Alembic deixa de ser fonte de verdade. | continuity-meeting §"Estado Atual" item 6. | **Sprint 0** |
| P0-4 | Webhooks retornam 200 mesmo em erro crítico — Stripe não faz retry. | continuity-meeting §P0-4. | **Sprint 3** |
| P0-5 | Webhooks aceitam JSON sem assinatura quando secret é placeholder — válido em dev, **perigoso em prod**. | webhooks.py linha 40 (`_is_placeholder`); ops-launch §"Decisões 2". | **Sprint 3** |
| P0-6 | `test_webhooks.py` **não existe** — webhooks sem cobertura de teste. | Listagem `apps/api/tests/`. | **Sprint 3** |
| P0-7 | History "Ver" aponta pra `/nesting?id=...` mas Nesting não reidrata o job. | continuity-meeting §P0-6. | **Sprint 2** |
| P0-8 | Dashboard ainda exibe **R$ 2.450, 47 nests, 91.8%** hardcoded (linhas 48, 64, 81 de dashboard/page.tsx). | Inspeção direta. | **Sprint 2** |

#### P1 — Riscos de qualidade pré-launch

| # | Problema | Fica em |
|---|---|---|
| P1-1 | Sem smoke E2E automatizado — toda validação é manual. | Sprint 4 |
| P1-2 | `pricing/page.tsx` permite checkout pago anônimo (sem redirect para sign-in). | Sprint 1 |
| P1-3 | History/Remnants podem não estar passando Bearer token em todas chamadas (não auditado). | Sprint 1 |
| P1-4 | `blocks_this_month` aparece como 0 em `/me` — métrica de plano inválida. | Sprint 1 |
| P1-5 | CORS/envs de produção ainda não definidos. | Sprint 5 |
| P1-6 | Pricing anuncia features (DXF, IA, ERP) que não existem. | Sprint 5 (ajuste copy) |

---

## 2. Decisão executiva (da ops-launch-meeting 2026-04-30)

**Launch é MVP operacional, não SaaS comercial completo.**

- **IN:** login Clerk individual, nesting persistido, History funciona, reabertura de job, G-Code, Remnants CRUD, isolamento user A/B.
- **OUT (pós-launch):** Stripe pago, PIX/boleto, DXF, IA, ERP, multiusuário empresarial, R2 storage permanente.
- **Stripe checkout/portal/webhooks** continuam no código mas **não são critério de aceite** do launch — webhooks Clerk **são** (sincronizar usuário no DB).

---

## 3. Roadmap por Sprint

Cada Sprint é um lote atômico com **owner único**, **arquivos permitidos**, **DoD verificável** e **dependência clara**. Nenhum Sprint começa antes do anterior fechar.

```
[S0 DB] → [S1 Auth] → [S2 UX/Nesting] → [S3 Webhooks] → [S4 E2E/CI] → [S5 Deploy] → [Launch] → [Backlog DXF]
                                        (S2 e S3 podem rodar em paralelo)
```

### Sprint 0 — DB acessível + Alembic source of truth

- **Owner:** Codex (DevOps + Database Architect)
- **Bloqueia:** Sprint 1
- **Arquivos permitidos:**
  - `apps/api/.env`
  - `apps/api/db/database.py`
  - `apps/api/db/migrations/**`
  - `apps/api/alembic.ini`
  - `apps/api/main.py` (apenas remover `create_all()` do path normal)
  - `docker-compose.yml`
  - `docs/local-development.md`
- **Sub-tasks:**
  1. Decisão humana pendente: Docker Postgres local vs Supabase vs Railway dev. *(Recomendação: Docker Postgres local para iterar; Supabase/Neon para staging.)*
  2. Corrigir `DATABASE_URL` para host acessível.
  3. Resolver enum mismatch (SQLAlchemy uppercase ↔ Alembic lowercase). Usar `values_callable=lambda x: [e.value for e in x]` ou padronizar lowercase em ambos.
  4. Remover `create_all()` do startup quando `DATABASE_URL` está set.
  5. `alembic upgrade head` sem erro.
  6. Validar `GET /health/db` → `{status:"ok", connected:true}`.
  7. Validar `GET /api/v1/me` → 200 com user real (Clerk dev mode aceitável aqui).
- **DoD:**
  - [ ] API sobe sem warning de DB
  - [ ] `DB_ENABLED=True` no log de startup
  - [ ] Tabelas `users`, `nestings`, `remnants` existem no Postgres
  - [ ] Criar nesting via `POST /api/v1/optimize` → aparece em `GET /api/v1/nestings`
  - [ ] `pytest -q` ainda passa (39+ testes)

---

### Sprint 1 — Auth Bearer + owner-scope + Pricing anti-anônimo

- **Owner:** Codex (Backend) + Antigravity (Frontend) — *paralelo, não tocam mesmos arquivos*
- **Bloqueado por:** Sprint 0
- **Bloqueia:** Sprint 2
- **Arquivos permitidos:**
  - **Codex:** `apps/api/routers/billing.py`, `apps/api/routers/nesting.py`, `apps/api/routers/remnants.py`, `apps/api/dependencies/auth.py`
  - **Antigravity:** `apps/web/src/app/(dashboard)/history/page.tsx`, `apps/web/src/app/(dashboard)/remnants/page.tsx`, `apps/web/src/app/pricing/page.tsx`
- **Sub-tasks Backend (Codex):**
  1. Auditoria: `billing.py` deriva `clerk_id` de `Depends(get_current_user_clerk_id)`, **não** de `request.body`. (Já testado, validar código bate.)
  2. Auditoria: `portal` busca `stripe_customer_id` de `users` table pelo `clerk_id` autenticado, **não** do body.
  3. Auditoria: `GET /api/v1/nestings/{id}` filtra por owner — usuário B 404 ao tentar nesting de A.
  4. Auditoria: `/api/v1/remnants/*` mesma regra de owner-scope.
- **Sub-tasks Frontend (Antigravity):**
  1. `history/page.tsx`: confirma que `api.listNestings()` envia Bearer Clerk via `getToken()` (testar com browser devtools).
  2. `remnants/page.tsx`: idem para `api.listRemnants()` e CRUD.
  3. `pricing/page.tsx`: se usuário não autenticado clica "Assinar Pro", redireciona para `/sign-in?redirect_url=/pricing` em vez de chamar checkout.
- **DoD:**
  - [ ] `pytest -q` passa (incluindo `test_user_isolation_flow.py`)
  - [ ] `pnpm lint && pnpm build` passam
  - [ ] Manual: abrir Network tab → toda chamada `/api/v1/*` em página logada tem header `Authorization: Bearer ...`
  - [ ] Manual: usuário B logado tenta `GET /api/v1/nestings/{id_de_A}` → 404
  - [ ] Manual: anônimo clica "Assinar Pro" → vai pra sign-in, não pra Stripe

---

### Sprint 2 — Dashboard real + Nesting reidrata por `?id=`

- **Owner:** Antigravity (Frontend) primário, Codex (Backend) suporte se faltar endpoint
- **Bloqueado por:** Sprint 1
- **Bloqueia:** Sprint 4
- **Pode rodar em paralelo com Sprint 3**
- **Arquivos permitidos:**
  - **Antigravity:** `apps/web/src/app/(dashboard)/dashboard/page.tsx`, `apps/web/src/app/(dashboard)/nesting/page.tsx`, `apps/web/src/components/nesting/**`
  - **Codex (se necessário):** `apps/api/routers/nesting.py` (apenas endpoint `GET /api/v1/nestings/{id}` se não existir/incompleto)
- **Sub-tasks:**
  1. Dashboard substitui hardcoded:
     - `R$ 2.450` (linha 48) → calcular economia real (precisa de método no backend ou cálculo local com `nestings`)
     - `47` (linha 64) → `nestings.length`
     - `91.8%` (linha 81) → média de `(100 - waste_percent)` dos nestings completos
     - "Último há 45 min" (linha 68) → `created_at` do mais recente formatado relativo
  2. NestingPage já lê `id` do searchParams (linha 59 confirma) — implementar fetch:
     - Se `id`: chamar `api.getNesting(id)` e popular `parts`, `result`, `selectedProfile` do retorno.
     - Se sem `id`: estado vazio normal.
  3. Canvas renderiza peças do nesting reaberto (`NestingCanvas` já aceita `result`).
  4. Botão "Gerar G-Code" funciona em job reaberto.
  5. Decisão de tema: Dashboard atualmente usa dark `bg-[#080808]` mas PLAN-end-to-end pede light `bg-[#f5f5f0]`. **Confirmar com JHON antes de mudar.**
- **DoD:**
  - [ ] Dashboard só mostra dados de `api.listNestings()` — zero hardcoded business data
  - [ ] Criar nesting → aparecer no History → clicar "Ver" → canvas renderiza peças → "Gerar G-Code" funciona → download `.nc` não vazio
  - [ ] Loading/empty/error states em todas as 4 telas
  - [ ] `pnpm lint && pnpm build` passam

---

### Sprint 3 — Webhooks confiáveis (test_webhooks.py + idempotência + signature obrigatória)

- **Owner:** Codex (Backend + Security)
- **Bloqueado por:** Sprint 0 (precisa do DB)
- **Bloqueia:** Sprint 4
- **Pode rodar em paralelo com Sprint 2**
- **Arquivos permitidos:**
  - `apps/api/routers/webhooks.py`
  - `apps/api/db/schema.py` (nova tabela `processed_webhook_events`)
  - `apps/api/db/migrations/versions/<nova>.py`
  - `apps/api/db/crud.py` (helpers de idempotência)
  - `apps/api/tests/test_webhooks.py` (NOVO arquivo)
- **Sub-tasks:**
  1. **Criar `test_webhooks.py`** com pelo menos:
     - `test_clerk_user_created_with_valid_signature_creates_db_user`
     - `test_clerk_invalid_signature_returns_403_in_prod_mode`
     - `test_clerk_dev_mode_with_placeholder_secret_accepts_unsigned`
     - `test_stripe_checkout_completed_upgrades_user_plan`
     - `test_stripe_subscription_deleted_downgrades_to_free`
     - `test_stripe_invoice_payment_failed_logs_and_marks`
     - `test_duplicate_event_id_is_noop` (idempotência)
  2. Webhooks retornam **5xx** em erro crítico (DB down, parse falhou) — **não** engolir com 200. Stripe precisa dos retries.
  3. Migration: tabela `processed_webhook_events` com `event_id UNIQUE NOT NULL`. Antes de processar, `INSERT ... ON CONFLICT DO NOTHING`. Se 0 rows, é duplicado → return 200 imediato sem side-effect.
  4. Em produção (`MVP_DEV_MODE=false`), rejeitar webhook sem signature **mesmo que** secret seja placeholder. Atualmente o `_is_placeholder` aceita request raw — só ok em dev.
- **DoD:**
  - [ ] `pytest apps/api/tests/test_webhooks.py -v` → todos passando
  - [ ] Evento Stripe duplicado (mesmo `event.id`) não duplica linha no DB
  - [ ] Produção sem `CLERK_WEBHOOK_SECRET` real → webhook retorna 503 ou 403, não 200
  - [ ] Erro de DB durante webhook → 500 (Stripe vai fazer retry)

---

### Sprint 4 — Smoke E2E (Playwright) + CI release gate

- **Owner:** Antigravity (QA) + Codex (DevOps)
- **Bloqueado por:** Sprint 2 + Sprint 3
- **Bloqueia:** Sprint 5
- **Arquivos permitidos:**
  - **Antigravity:** `playwright.config.ts`, `tests/e2e/**`, `apps/web/package.json` (adicionar deps Playwright)
  - **Codex:** `.github/workflows/ci.yml`, `Makefile`, `scripts/verify.sh`
- **Sub-tasks:**
  1. Adicionar Playwright **somente Chromium** inicialmente. Não cobrir Firefox/WebKit ainda.
  2. Cobrir jornada: sign-in → dashboard carrega → criar nesting pequeno (3 peças, 1 perfil) → ver no History → clicar Ver → canvas renderiza → gerar G-Code → assert download .nc tem `>0` bytes → criar 1 retalho → toggle reservar → deletar.
  3. Fixtures de API quando Clerk/Stripe indisponíveis: usar `MVP_DEV_MODE=true` + Clerk dev keys.
  4. CI workflow: jobs paralelos `backend-tests` (pytest), `frontend-build` (lint+build), `e2e` (Playwright contra app rodando local). Falha em qualquer um → bloqueia merge.
  5. `make verify` roda tudo local antes de push. README atualizado.
- **DoD:**
  - [ ] `make verify` passa em <5 min local
  - [ ] CI verde em PR de teste
  - [ ] Smoke E2E roda em <3 min em Chromium
  - [ ] Branch `main` protegida exigindo CI verde

---

### Sprint 5 — Deploy: Railway/Fly + Vercel + Postgres prod

- **Owner:** Codex (DevOps + Security) + Antigravity (frontend envs)
- **Bloqueado por:** Sprint 4
- **Arquivos permitidos:**
  - `apps/api/Dockerfile`, `apps/api/railway.toml` ou `fly.toml`
  - `apps/web/vercel.json` (se necessário)
  - `.env.example` (placeholders prod)
  - `docs/runbook-deploy.md` (NOVO)
  - `.github/workflows/deploy.yml`
- **Sub-tasks:**
  1. **Decisão humana pendente:** Railway vs Fly.io para API. Postgres: Supabase vs Neon vs Railway DB.
  2. Dockerfile prod-ready: multi-stage, non-root, `$PORT` dinâmico, healthcheck `/health`.
  3. Postgres prod com pooled connection string. Aplicar `alembic upgrade head` no deploy script.
  4. Vercel: `NEXT_PUBLIC_API_URL=https://api.moldurize.com` (ou domínio escolhido), Clerk prod keys.
  5. CORS allowlist específica em prod (não `*`).
  6. Envs prod sanitizadas: `MVP_DEV_MODE=false`, `CLERK_ISSUER_URL` real, `CLERK_WEBHOOK_SECRET` real, secrets via dashboard do host (nunca repo).
  7. Configurar webhook Stripe prod apontando pra API URL prod.
  8. Configurar webhook Clerk prod idem.
  9. `docs/runbook-deploy.md`: como deployar, como rollback, como ler logs, quem chamar se cair.
- **DoD:**
  - [ ] App acessível em URL pública HTTPS
  - [ ] Login Clerk real funciona ponta-a-ponta
  - [ ] `/health` retorna 200 em prod
  - [ ] Smoke manual da seção 4 passa em prod
  - [ ] Rollback testado (deploy versão anterior em <5 min)

---

### Backlog (pós-launch)

- **DXF upload + True Shape** — task #20
- **Métricas reais de `blocks_this_month`** — persistência separada
- **Stripe webhooks pagos completos** — `customer.subscription.updated` com proração, `invoice.upcoming` com aviso
- **Multi-tenant / orgs empresariais**
- **R2 storage permanente de G-Code**
- **Performance: nesting com Web Worker** se canvas travar com >100 peças

---

## 4. Smoke Test Manual (Go/No-Go)

Ordem fixa, executar antes de deploy prod. Cada item deve passar; um falha = No-Go.

1. Subir Postgres + API + Web no ambiente
2. Aplicar Alembic head
3. `GET /health` → 200
4. `GET /health/db` → `connected: true`
5. Login Clerk com user A
6. Dashboard carrega sem erro de console
7. `/api/v1/me`, `/api/v1/nestings`, `/api/v1/remnants` → todos 200
8. Settings mostra plano real (não "free" hardcoded)
9. Criar nesting com 3 peças
10. Refresh Dashboard → uso incrementou
11. History mostra o job
12. "Ver" abre o job no canvas
13. Gerar G-Code do job reaberto
14. Baixar `.nc` com tamanho > 0
15. Criar retalho 1010×450mm
16. Listar, toggle reservado, deletar
17. Logout, login user B → não vê nada de A
18. (Pós-launch) Webhook Clerk dispara → user em DB; webhook Stripe dispara → plano atualiza

---

## 5. Operating Rules durante execução

Reforço das regras da agência (`operating-model.md`):

1. **Nenhum agente edita fora dos arquivos permitidos do seu Sprint.** Se precisar, sobe pro Tech Lead.
2. **Nenhum Sprint aceita "corrijo depois".** DoD é binário — passou ou não passou.
3. **Toda dispatch tem 4 partes:** GOAL (1 frase), ALLOWED PATHS (lista), ACCEPTANCE CRITERIA (lista), REPORTING (output esperado).
4. **Tech Lead (Claude) revisa diff e roda comando de verificação no workspace principal** antes de aceitar.
5. **Decisões humanas pendentes** ficam marcadas no Sprint correspondente; agentes não inventam resposta.

---

## 6. Decisões humanas pendentes (precisam do JHON)

1. **Sprint 0:** Docker Postgres local vs Supabase vs Railway? *(rec: Docker local + Supabase staging)*
2. **Sprint 2:** Dashboard mantém dark `#080808` ou volta pro light `#f5f5f0` da PLAN-end-to-end?
3. **Sprint 4:** Adicionar Playwright como dep nova é ok? (~50MB)
4. **Sprint 5:** Railway vs Fly.io pra API; Supabase vs Neon vs Railway pra DB.
5. **Geral:** Stripe checkout fica habilitado em prod no launch ou esconde até Sprint pós-launch?

---

## 7. Tasks ativas (sincronizadas com TaskList)

| ID | Sprint | Status | Owner |
|---|---|---|---|
| #14 | Sprint 0 — DB | pending | codex |
| #15 | Sprint 1 — Auth | pending (blocked by #14) | codex+antigravity |
| #16 | Sprint 2 — UX | pending (blocked by #15) | antigravity |
| #17 | Sprint 3 — Webhooks | pending | codex |
| #18 | Sprint 4 — E2E/CI | pending (blocked by #16+#17) | antigravity+codex |
| #19 | Sprint 5 — Deploy | pending (blocked by #18) | codex+antigravity |
| #20 | Backlog — DXF | pending (blocked by #19) | — |

---

## 8. Histórico de quem decidiu o quê

- 2026-04-29 — `continuity-meeting`: agência define Sprint 0–5.
- 2026-04-30 — `ops-launch-meeting`: dono decreta MVP operacional sem Stripe pago como gate.
- 2026-05-04 — **este documento** consolida tudo, marca tasks #9 e #10 como já cumpridas (commits + test_billing_flow), define dependências entre Sprints e isola decisões humanas pendentes.
