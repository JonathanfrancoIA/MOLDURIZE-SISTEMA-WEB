# MOLDURIZE WEB — Plano End-to-End (login → nesting → gcode)

> **Objetivo:** Fazer o fluxo completo funcionar sem dados hardcoded  
> **Aprovado por:** Usuário (Opção A)  
> **Data:** 28/04/2026

---

## Specialist Assignments

### 🔵 AGENT: devops-engineer
**Scope:** Git inicial + configuração de ambiente
**Arquivos:**
- `.gitignore` (verificar se está correto)
- `apps/api/.env` (configurar DATABASE_URL)
- `apps/web/.env.local` (configurar Clerk keys)
- `docker-compose.yml` (subir PostgreSQL local)

**Tasks:**
1. Fazer commit inicial do Git com todo o código atual
2. Criar `apps/api/.env` funcional (PostgreSQL local via Docker)
3. Verificar `docker-compose.yml` para subir db + redis
4. Documentar variáveis necessárias para rodar localmente

---

### 🟢 AGENT: backend-specialist  
**Scope:** PostgreSQL + Alembic + API de dados reais
**Arquivos:**
- `apps/api/db/database.py`
- `apps/api/db/schema.py`
- `apps/api/db/crud.py`
- `apps/api/routers/nesting.py`
- `apps/api/alembic.ini`

**Tasks:**
1. Rodar migrações Alembic (`alembic upgrade head`)
2. Verificar se `POST /api/v1/optimize` salva no banco (nesting_id no response)
3. Verificar se `GET /api/v1/nestings` retorna dados reais do banco
4. Garantir que o nesting salva `name`, `status=completed`, `total_blocks`, `waste_percent`
5. Testar: `pytest apps/api/tests/ -v`

---

### 🟡 AGENT: frontend-specialist
**Scope:** Dashboard real + Settings real + Design unification
**Arquivos:**
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/settings/page.tsx`
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/page.tsx`

**Tasks:**
1. Dashboard: substituir métricas hardcoded por dados reais da API
   - Calcular eficiência média dos nestings reais
   - Mostrar total de jobs do banco
   - Conectar retalhos ao `api.listRemnants()`
2. Settings: conectar `currentPlan` ao Clerk user metadata
3. Unificar design: Dashboard page para usar `bg-[#f5f5f0]` (light, igual ao layout)
4. Garantir que `history/page.tsx` e `remnants/page.tsx` tratam erro de API offline

---

### 🔴 AGENT: security-auditor
**Scope:** Clerk Auth flow + variáveis de ambiente
**Arquivos:**
- `apps/web/src/middleware.ts`
- `apps/web/src/app/(dashboard)/layout.tsx`
- `apps/web/.env.local`
- `apps/api/routers/webhooks.py`
- `apps/api/dependencies/`

**Tasks:**
1. Verificar se `middleware.ts` está protegendo corretamente as rotas do dashboard
2. Verificar se o fallback de desenvolvimento (sem chaves Clerk) é seguro
3. Verificar se variáveis sensíveis não estão expostas no bundle do Next.js
4. Documentar quais chaves são obrigatórias vs opcionais para rodar localmente

---

## Ordem de Execução (Dependências)

```
[1] devops-engineer (Git + ENV)
        ↓
[2] backend-specialist (DB + Alembic)   ← paralelo com [3]
[3] security-auditor (Auth check)       ← paralelo com [2]
        ↓
[4] frontend-specialist (Dashboard real + Design)
        ↓
[5] Verificação final: fluxo completo login → nesting → gcode → download
```

---

## Definition of Done ✅

O MVP estará completo quando:

- [ ] `git log` mostra pelo menos 1 commit
- [ ] `docker compose up -d db` sobe PostgreSQL sem erro
- [ ] `alembic upgrade head` aplica todas as migrações
- [ ] `uvicorn main:app` sobe a API na porta 8001
- [ ] `GET /health` retorna `{"status": "ok"}`
- [ ] `GET /api/v1/nestings` retorna lista (pode ser vazia)
- [ ] `POST /api/v1/optimize` retorna resultado E salva no banco
- [ ] `GET /api/v1/nestings` depois do optimize mostra o job salvo
- [ ] Frontend em `localhost:3000` carrega sem erro 500
- [ ] Dashboard mostra projetos reais (não hardcoded)
- [ ] Nesting page calcula → mostra canvas → gera gcode → baixa arquivo .nc
- [ ] History page mostra os nestings salvos
- [ ] Remnants page CRUD funciona (adicionar, toggle, deletar)

---

## Notas de Contexto para Especialistas

### Arquitetura-chave
- API roda em `:8001`, frontend em `:3000`
- Sem DATABASE_URL → mode in-memory (nesting não persiste)  
- Clerk desabilitado gracefully quando `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` não está configurado ou contém "SUBSTITUA"
- `@moldurize/shared` exporta `createApiClient()` + todos os tipos TypeScript

### Porta inconsistente (bug conhecido)
- `docker-compose.yml` mapeia API para porta `8000`
- `Makefile dev-api` usa porta `8001`
- `apps/api/.env.example` usa `8001` 
- **Padronizar para 8001** em todos os lugares

### Design tokens (para frontend-specialist)
- Light theme: `bg-[#f5f5f0]`, `text-[#171713]`, `border-black/10`
- Accent: `bg-[#c9952f]`, `text-[#f2c767]`
- Dark background (canvas): `bg-[#171713]`
