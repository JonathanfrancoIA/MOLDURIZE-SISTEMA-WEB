# Next Steps MVP

Este e o plano recomendado para a proxima etapa do MOLDURIZE WEB.

## Situacao atual

Concluido recentemente:

- endpoint `/api/v1/me`;
- Settings e Dashboard lendo dados de conta/plano;
- limite mensal de nesting no backend;
- contador `nestings_this_month`;
- detalhe de nesting filtrado por dono;
- checkout com `clerk_id`;
- historico legivel no tema claro;
- testes backend e build frontend verdes.

Bloqueio atual:

- API inicia, mas o `DATABASE_URL` atual nao conectou. O host configurado nao
  resolveu DNS no ambiente local.

## Fase 0 - Estabilizar ambiente

Owner sugerido: DevOps Engineer

Tarefas:

1. Definir se o ambiente local vai usar Docker Postgres ou Supabase remoto.
2. Ajustar `apps/api/.env` para um `DATABASE_URL` acessivel.
3. Rodar `make db-migrate`.
4. Validar `GET /health`.
5. Validar `GET /api/v1/me`.
6. Documentar setup real em `docs/local-development.md`.

Aceite:

- API sobe sem warning de conexao DB;
- `DB_ENABLED=True`;
- tabelas existem;
- `/api/v1/me` responde 200 em modo dev.

## Fase 1 - Smoke test MVP real

Owner sugerido: QA Automation Engineer + Backend Specialist + Frontend Specialist

Fluxo:

1. Criar/usar usuario Clerk.
2. Abrir dashboard.
3. Rodar nesting.
4. Confirmar incremento de uso.
5. Confirmar job em Historico.
6. Gerar e baixar G-Code.
7. Criar/listar/descartar retalho.

Aceite:

- fluxo completo funciona sem dados fake;
- falhas aparecem como mensagem clara;
- nenhum erro 500 no browser/API.

## Fase 2 - Webhooks locais

Owner sugerido: Billing Consultant + Security Auditor

Tarefas:

1. Clerk webhook `user.created`, `user.updated`, `user.deleted`.
2. Stripe webhook `checkout.session.completed`.
3. Stripe `customer.subscription.updated`.
4. Stripe `customer.subscription.deleted`.
5. Validar downgrade para Free.

Aceite:

- usuario criado no Clerk vira linha em `users`;
- checkout pago atualiza plano no DB;
- cancelamento rebaixa plano;
- assinatura invalida e rejeitada fora de dev mode.

## Fase 3 - E2E automatizado

Owner sugerido: QA Automation Engineer

Tarefas:

1. Adicionar Playwright ou fluxo equivalente se o projeto aceitar dependencia.
2. Cobrir dashboard/settings/history/nesting.
3. Criar fixtures de API quando Clerk/Stripe nao estiverem disponiveis.
4. Rodar no CI.

Aceite:

- E2E cobre jornada principal;
- CI falha se dashboard voltar a exibir hardcoded principal;
- screenshot/video disponivel em falha.

## Fase 4 - DXF / True Shape

Owner sugerido: Nesting / Geometry Consultant + Backend Specialist + Frontend Specialist

Tarefas:

1. Expor rota `/api/v1/dxf/upload`.
2. Validar tamanho/formato de arquivo.
3. Integrar `true_shape.py`.
4. Adicionar UI de upload na pagina Nesting.
5. Mostrar preview e erros de parsing.

Aceite:

- upload DXF retorna geometrias normalizadas;
- nesting processa pelo menos um fixture DXF;
- falhas de arquivo nao quebram pagina.

## Fase 5 - Deploy

Owner sugerido: DevOps Engineer + Security Auditor

Tarefas:

1. Railway ou equivalente para API.
2. Postgres de producao.
3. Vercel para web.
4. Env vars revisadas.
5. CORS e Clerk URLs de producao.
6. Stripe webhook de producao.

Aceite:

- deploy web chama API real;
- health checks passam;
- secrets fora do repo;
- rollback documentado.

## Ordem recomendada de agentes para a proxima rodada

1. DevOps Engineer resolve DB local/prod acessivel.
2. Backend Specialist valida persistencia com DB real.
3. QA Automation Engineer executa smoke test manual/automatizado.
4. Security Auditor revisa auth/billing/webhooks.
5. Frontend Specialist ajusta UX de erros encontrados.

## Riscos ativos

- `DATABASE_URL` remoto instavel ou inacessivel.
- Webhooks ainda nao comprovados em fluxo real.
- Billing depende de `clerk_id` presente no checkout; usuarios anonimos devem ser bloqueados antes de assinar.
- `blocks_this_month` ainda aparece como 0 no `/me`; se virar metrica de cobranca, precisa persistencia propria.
