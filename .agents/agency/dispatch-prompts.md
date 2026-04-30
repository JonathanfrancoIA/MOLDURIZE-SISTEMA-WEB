# Dispatch Prompts

Use estes templates para enviar tarefas aos agentes.

## Backend Specialist

```text
GOAL: <resultado do usuario em uma frase>

ALLOWED PATHS:
- apps/api/<paths>
DO NOT modify anything outside these paths.
You are not alone in the codebase; do not revert edits made by others.

CONTEXT:
<explique o bug ou feature>
Read existing router/service/test patterns before editing.

ACCEPTANCE CRITERIA:
- <criterio verificavel>
- `pytest -q` passes from apps/api.

REPORTING:
List files changed, summarize behavior, and paste exact pytest output. Do not commit.
```

## Frontend Specialist

```text
GOAL: <resultado visual/fluxo em uma frase>

ALLOWED PATHS:
- apps/web/<paths>
DO NOT modify anything outside these paths.
You are not alone in the codebase; do not revert edits made by others.

CONTEXT:
Follow existing Next.js/Tailwind patterns. For authenticated API calls, use the
same Clerk getToken pattern used in the nesting page.

ACCEPTANCE CRITERIA:
- UI state handles loading, empty, success and error.
- No unreadable contrast.
- `pnpm lint` passes from apps/web.
- `pnpm build` passes from apps/web.

REPORTING:
List files changed, summarize behavior, and paste lint/build output. Do not commit.
```

## Shared Contract Specialist

```text
GOAL: Align frontend types/client with backend API contract.

ALLOWED PATHS:
- packages/shared/src/api.ts
- packages/shared/src/types.ts
DO NOT modify backend or frontend pages.

CONTEXT:
Backend endpoint shape:
<paste payload example>

ACCEPTANCE CRITERIA:
- Types match the payload exactly.
- Existing consumers compile.

REPORTING:
List files changed and note any backend/frontend follow-up required.
```

## Security Auditor

```text
GOAL: Review auth, owner scoping, billing and secret exposure for <feature>.

ALLOWED PATHS:
- READ ONLY unless explicitly assigned.

CONTEXT:
Focus on Clerk, Stripe, user data isolation, webhooks, and env leakage.

ACCEPTANCE CRITERIA:
- Findings are ordered by severity.
- Each finding cites file and line.
- No speculative issues without exploit path.

REPORTING:
Return findings first. If no findings, say so and list residual risk.
```

## QA Automation Engineer

```text
GOAL: Add tests that prove <workflow/bugfix> works.

ALLOWED PATHS:
- apps/api/tests/**
- apps/web/**/__tests__/**
- tests/**
DO NOT modify implementation files unless explicitly asked.

CONTEXT:
Prefer tests that fail against the previous bug and pass after the fix.

ACCEPTANCE CRITERIA:
- Tests cover success and failure paths.
- Verification command passes.

REPORTING:
List tests added and paste command output.
```

## DevOps Engineer

```text
GOAL: Make local/prod environment for <service> reproducible.

ALLOWED PATHS:
- docker-compose.yml
- Makefile
- .github/**
- apps/**/Dockerfile
- apps/**/.env.example
- docs/**

CONTEXT:
Project ports: web 3000, API 8001, Postgres 5432, Redis 6379.
Never commit real secrets.

ACCEPTANCE CRITERIA:
- Commands are documented.
- Healthcheck path works.
- Env examples are consistent.

REPORTING:
List files changed and paste validation output.
```
