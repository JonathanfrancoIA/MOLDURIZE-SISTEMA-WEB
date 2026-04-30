# MOLDURIZE WEB - Agency Continuity Meeting

Data: 2026-04-29
Formato: reuniao assíncrona da agencia, read-only
Objetivo: definir as proximas etapas do projeto MOLDURIZE WEB com base no estado real do repositorio.

## Participantes

- Agency Director / Product Owner: prioridade e valor do MVP.
- Project Planner: sequenciamento e dependencias.
- Backend + Database + DevOps Advisor: persistencia, migracoes, ambiente e API.
- Frontend + UX Advisor: continuidade da jornada e prontidao visual.
- QA Automation + Release Manager: cobertura, smoke test e go/no-go.
- Security + Billing Consultant: auth, owner scope, Stripe, Clerk e webhooks.
- Tech Lead / Orchestrator: consolidacao, arbitragem e plano final.

## Decisao Executiva

O projeto nao deve avancar para novas features pagas antes de fechar uma rodada
de estabilizacao do MVP.

Ordem aprovada pela agencia:

1. Congelar e validar o baseline atual.
2. Resolver banco, migracoes, enum mapping e ambiente.
3. Provar persistencia real ponta a ponta.
4. Corrigir auth token em todas as telas protegidas.
5. Blindar billing e webhooks.
6. Fechar continuidade UX: History -> abrir nesting salvo -> gerar G-Code.
7. Criar smoke/E2E fino.
8. So depois iniciar DXF/True Shape e deploy.

## Estado Atual

Ja existe:

- FastAPI com routers de nesting, G-Code, remnants, billing, webhooks e users.
- Next.js dashboard app com Dashboard, Nesting, History, Remnants, Settings e Pricing.
- Clerk no frontend e dependencia JWT no backend.
- Stripe checkout/portal/webhook basico.
- `/api/v1/me`.
- Dashboard e Settings consumindo dados de conta/plano.
- Limite mensal de nesting no backend.
- Detalhe de nesting filtrado por dono.
- Checkout enviando `clerk_id`.
- Historico legivel no tema claro.
- Testes backend relevantes: 39 testes passando.

Ainda nao esta pronto para cliente real porque:

- `DATABASE_URL` atual nao conecta; host Supabase nao resolve DNS localmente.
- Docker nao esta disponivel nesta maquina.
- Migrations e Postgres real ainda nao foram provados.
- SQLAlchemy enums podem gravar valores uppercase enquanto Alembic criou enums lowercase.
- Startup ainda usa `create_all()` quando ha `DATABASE_URL`, o que enfraquece Alembic como fonte de verdade.
- Billing endpoints ainda aceitam inputs sensiveis do cliente sem autenticar pelo backend.
- Webhooks aceitam JSON sem assinatura quando secrets faltam/estao placeholder.
- Falhas de webhook sao engolidas e retornam 200, impedindo retry.
- History e Remnants ainda precisam usar cliente API com token Clerk.
- History aponta para `/nesting?id=...`, mas Nesting nao reidrata job salvo.
- CI/test scripts ainda nao representam o gate completo de release.

## Principais Riscos

### P0 - Bloqueadores

1. Banco inacessivel ou fallback silencioso sem persistencia.
2. Enum mismatch em Postgres real.
3. Billing manipulavel pelo cliente.
4. Webhook sem assinatura em producao ou sem retry em erro.
5. Auth inconsistente em paginas protegidas.
6. Jornada incompleta: job salvo no History nao reabre no Nesting.

### P1 - Riscos de lancamento

1. Falta de smoke/E2E automatizado.
2. Deploy sem depender de CI verde.
3. CORS e envs de producao amplos ou incompletos.
4. `blocks_this_month` ainda nao e uma metrica real.
5. Public pricing anuncia recursos futuros que ainda nao estao integrados.

## Plano de Continuidade

### Sprint 0 - Baseline e Ambiente

Objetivo: ter um baseline confiavel e um banco acessivel.

Owners:
- Tech Lead / Orchestrator
- DevOps Engineer
- Database Architect
- QA Automation Engineer

Tarefas:

1. Revisar e salvar baseline atual com testes verdes.
2. Escolher fonte de DB para desenvolvimento: Docker Postgres, Postgres nativo ou hosted DB.
3. Corrigir `DATABASE_URL` local para um banco acessivel.
4. Padronizar API local em `8001`; Dockerfile deve acompanhar ou usar `$PORT` em producao.
5. Corrigir enum mapping antes de aplicar migracoes em Postgres real.
6. Remover `create_all()` do caminho normal de producao; usar Alembic explicitamente.
7. Rodar `alembic upgrade head`.
8. Validar `/health`, `/api/v1/me`, `/api/v1/optimize`, `/api/v1/nestings`, `/api/v1/remnants`.

Definition of Done:

- `pytest -q` passa.
- `pnpm lint` passa.
- `pnpm build` passa.
- API inicia sem warning de DB.
- `DB_ENABLED=True` com DB real.
- Migrations aplicadas.
- Um nesting criado aparece no History apos refresh.

### Sprint 1 - Auth e Persistencia Real

Objetivo: todas as telas protegidas usam auth corretamente e persistem dados reais.

Owners:
- Backend Specialist
- Frontend Specialist
- Shared Contract Specialist
- Security Auditor

Tarefas:

1. History usa cliente com token Clerk.
2. Remnants usa cliente com token Clerk.
3. Pricing bloqueia checkout pago anonimo ou redireciona para sign-in.
4. Backend billing deriva `clerk_id` do token, nao do body.
5. Portal Stripe deriva `customer_id` do usuario no DB, nao do body.
6. `/api/v1/nestings/{id}` e remnants seguem owner scope.
7. Dashboard diferencia API offline, sessao expirada e limite de plano.

Definition of Done:

- Chamadas protegidas enviam Bearer token.
- Usuario anonimo nao cria checkout pago.
- Usuario nao abre portal de outro customer.
- Usuario A nao ve dados do Usuario B.
- Erros 401/403/5xx aparecem como mensagens compreensiveis.

### Sprint 2 - Continuidade UX do MVP

Objetivo: fechar a jornada `nesting -> history -> reopen -> gcode`.

Owners:
- Frontend Specialist
- Backend Specialist
- QA Automation Engineer
- CNC / G-Code Consultant

Tarefas:

1. `NestingPage` le `id` da query string.
2. Buscar job salvo via `api.getNesting(id)`.
3. Reidratar canvas e metadados do nesting salvo.
4. Permitir gerar/download G-Code a partir de job reaberto.
5. Ajustar loading/empty/error states em Nesting e History.
6. Passar responsividade em Dashboard, History, Nesting, Remnants e Settings.

Definition of Done:

- Job criado aparece no History.
- Clicar em `Ver` abre o job salvo.
- Canvas mostra pecas salvas.
- G-Code pode ser gerado novamente.
- Fluxo funciona em mobile/tablet/desktop sem scroll horizontal indevido.

### Sprint 3 - Billing e Webhooks Confiaveis

Objetivo: garantir que plano pago vem de Stripe/DB, nao do frontend.

Owners:
- Billing Consultant
- Security Auditor
- Backend Specialist
- Database Architect

Tarefas:

1. Clerk webhooks: `user.created`, `user.updated`, `user.deleted`.
2. Stripe webhooks: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
3. Produção deve rejeitar webhook sem secret real.
4. Handler deve retornar non-2xx quando falhar processamento critico, para permitir retry.
5. Adicionar idempotencia de eventos por event id.
6. Adicionar constraints/indices para Stripe customer/subscription quando apropriado.
7. Validar downgrade para Free.

Definition of Done:

- Evento Clerk assinado cria/atualiza/remove usuario.
- Checkout pago atualiza plano no DB.
- Cancelamento/downgrade rebaixa plano.
- Evento duplicado nao causa efeito colateral.
- Assinatura invalida e rejeitada fora de dev.

### Sprint 4 - QA/E2E e Release Gate

Objetivo: transformar smoke test manual em gate repetivel.

Owners:
- QA Automation Engineer
- DevOps Engineer
- Delivery Manager

Tarefas:

1. Adicionar Playwright fino, se aprovado.
2. Cobrir Chromium apenas no primeiro momento.
3. Testar Dashboard/Settings com dados reais.
4. Testar Nesting -> G-Code -> Download.
5. Testar History mostrando nesting persistido.
6. Testar Remnants create/toggle/delete.
7. Corrigir root scripts para `verify` real.
8. Fazer deploy depender de CI verde.

Definition of Done:

- Smoke manual documentado.
- E2E fino roda localmente ou em staging.
- CI roda backend tests, frontend lint/build e smoke/E2E quando ambiente existir.
- Release tem go/no-go claro.

### Sprint 5 - DXF / True Shape

Objetivo: iniciar feature avancada somente depois do MVP estabilizado.

Owners:
- Nesting / Geometry Consultant
- Backend Specialist
- Frontend Specialist
- QA Automation Engineer

Tarefas:

1. Rota `/api/v1/dxf/upload`.
2. Validacao de arquivo.
3. Integração com `true_shape.py`.
4. UI de upload no Nesting.
5. Fixture DXF.
6. Preview e erro de parsing.

Definition of Done:

- Upload DXF retorna geometrias normalizadas.
- Fixture DXF processa no backend.
- UI mostra preview ou erro sem quebrar pagina.

## Smoke Test Manual Aprovado

1. Subir Postgres/Redis/API/Web no ambiente escolhido.
2. Aplicar Alembic.
3. `GET /health` retorna 200.
4. API inicia com DB pronto, sem fallback.
5. Login com usuario Clerk de teste.
6. Dashboard carrega sem erro de console.
7. `/api/v1/me`, `/api/v1/nestings`, `/api/v1/remnants` retornam 200.
8. Settings mostra plano/uso real.
9. Criar nesting pequeno.
10. Refresh em Dashboard/Settings mostra uso incrementado.
11. History mostra job persistido.
12. `Ver` reabre job.
13. Gerar G-Code.
14. Baixar `.nc` nao vazio.
15. Criar/listar/descartar/deletar retalho.
16. Testar limite Free.
17. Testar segundo usuario sem ver dados do primeiro.
18. Testar webhooks Clerk/Stripe quando secrets reais estiverem configurados.

## Go / No-Go

Go:

- DB acessivel.
- Migrations aplicadas.
- Testes e build verdes.
- Jornada principal passa.
- Owner isolation passa.
- Billing server-owned.
- Webhooks assinados e testados.
- Deploy bloqueado por CI verde.

No-Go:

- App roda sem persistencia sem aviso claro.
- Usuario A ve dados do Usuario B.
- Checkout pago anonimo funciona.
- Portal aceita `customer_id` do cliente.
- Webhook sem assinatura atualiza DB em producao.
- API retorna 500 no fluxo principal.

## Decisoes Humanas Pendentes

1. DB de referencia do MVP: Docker local, Postgres nativo, Supabase, Railway ou outro.
2. Limites finais dos planos, especialmente blocos e reset mensal.
3. Checkout pago exige login? Recomendacao da agencia: sim.
4. Recursos ainda nao prontos devem aparecer no pricing? Recomendacao: ocultar ou marcar como "em breve".
5. Quais perfis CNC devem ser certificados antes do primeiro cliente?
6. Aprovar commit/tag do baseline atual antes de novas mudancas.

## Proxima Reuniao Recomendada

Tema: Sprint 0 - Baseline e Ambiente

Participantes:
- Tech Lead / Orchestrator
- DevOps Engineer
- Database Architect
- Backend Specialist
- QA Automation Engineer

Entrada obrigatoria:
- decisao de DB;
- estado do Docker/Postgres local;
- worktree revisado;
- comandos de verificacao esperados.

Saida esperada:
- DB funcionando;
- migrations aplicadas;
- smoke backend real;
- docs de ambiente atualizadas.
