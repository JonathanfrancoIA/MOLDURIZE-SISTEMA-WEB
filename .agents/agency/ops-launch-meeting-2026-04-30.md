# MOLDURIZE WEB - Ops Launch Meeting

Data: 2026-04-30
Meta: deixar o app operacional ate 2026-05-01.
Diretriz do dono: foco em funcionamento e login individual. Formas de pagamento ficam para depois.

## Decisao Executiva

O escopo de amanha e um MVP operacional, nao um SaaS comercial completo.

O app deve permitir que cada usuario faca login, use o sistema com dados proprios,
crie nestings, veja historico, reabra projetos, gere G-Code e gerencie retalhos.

Stripe, checkout, portal, webhooks pagos, PIX/boleto/cartao, DXF, IA, ERP, R2 e
automacoes de deploy ficam fora do caminho critico.

## Escopo IN

- Login individual com Clerk.
- Rotas internas protegidas.
- API recebendo Bearer token e resolvendo `clerk_id`.
- `/api/v1/me` retornando usuario autenticado.
- Banco real com `users`, `nestings` e `remnants`.
- Nesting persistido e contador mensal incrementado.
- History listando jobs reais do usuario.
- `Ver` reabrindo `/nesting?id=...` com canvas e dados salvos.
- Gerar e baixar G-Code a partir de nesting novo ou reaberto.
- Remnants CRUD: criar, listar, descartar/restaurar e deletar.
- Dashboard e Settings com dados reais ou erro claro.
- Isolamento minimo: usuario B nao ve dados do usuario A.
- Smoke manual final.

## Escopo OUT

- Pagamentos e assinaturas reais.
- Stripe checkout, portal e webhooks como criterio de aceite.
- Upgrade/downgrade de plano.
- PIX, boleto e cartao.
- DXF upload e True Shape.
- IA, ERP, API publica, SSO, multiusuario empresarial.
- R2/storage, Redis/Celery, arquivo permanente de G-Code.
- Playwright completo e deploy automatizado bloqueado por CI.

## Decisoes Tecnicas

1. Operacao real exige Clerk real, `CLERK_ISSUER_URL` real e DB real.
2. `MVP_DEV_MODE=true` nao aprova login individual real.
3. `DATABASE_URL` deve apontar para Postgres acessivel; SQLite so serve para demo local explicita.
4. `/health/db` deve retornar `status: ok`, `connected: true` e migration aplicada.
5. Pagamento deve sair da jornada operacional para nao quebrar o smoke.
6. Remnants precisa ficar visualmente operacional no mesmo tema claro do dashboard.
7. G-Code deve ser tratado como parte do app logado.

## Ordem De Execucao

1. Backend/Auth:
   - preservar `HTTPException` em auth;
   - exigir auth em G-Code;
   - adicionar testes de isolamento de usuario para remnants/listas.

2. Frontend/UX:
   - reestilizar Remnants para tema claro e responsivo;
   - remover ou neutralizar billing/pagamento em Settings;
   - manter a jornada operacional limpa.

3. DevOps/Runbook:
   - atualizar env examples com `CLERK_ISSUER_URL` e API `8001`;
   - documentar setup sem pagamento;
   - deixar claro que `MVP_DEV_MODE=false` e Postgres real sao pre-condicoes.

4. QA:
   - rodar `python -m pytest -q`;
   - rodar `pnpm lint`;
   - rodar `pnpm build`;
   - executar smoke manual A/B quando Clerk e DB reais estiverem configurados.

## Go/No-Go

GO:

- Login A e B funcionam.
- Usuario deslogado nao acessa app interno.
- Dados de A e B ficam isolados.
- Backend esta com `MVP_DEV_MODE=false`, `CLERK_ISSUER_URL` real e Postgres real.
- Nesting salva, aparece no History e reabre.
- G-Code gera e baixa arquivo nao vazio.
- Remnants CRUD funciona e persiste.
- Nenhum fluxo de pagamento e necessario.
- Testes/build/lint passam.

NO-GO:

- App roda em dev auth como se fosse login real.
- DB nao conecta ou nao persiste.
- `CLERK_ISSUER_URL` ausente, placeholder ou de outro projeto Clerk.
- Usuario B ve dados do usuario A.
- History nao reabre nesting salvo.
- G-Code falha.
- Remnants fica ilegivel/inoperavel.
- Pagamento bloqueia qualquer parte da operacao Free.
