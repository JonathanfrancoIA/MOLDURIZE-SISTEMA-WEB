# Completion Plan

## Goal
Finalizar a integração ponta-a-ponta (End-to-End) do MOLDURIZE WEB, conectando o status real da assinatura (Stripe) e do usuário (Clerk) ao frontend, garantindo que o banco de dados esteja rodando corretamente para o lançamento do MVP.

## Tasks
- [ ] Task 1: Criar rota `/api/v1/me` no backend para retornar o plano e os limites atuais do usuário (usando o `clerk_id` do JWT). → Verify: Chamada via Swagger (`/docs`) ou `curl` retorna os dados do usuário.
- [ ] Task 2: Atualizar `apps/web/src/app/(dashboard)/settings/page.tsx` para consumir `/api/v1/me` (remover o TODO e o estado hardcoded "free"). → Verify: A página de ajustes exibe o plano correto baseado no banco de dados.
- [ ] Task 3: Atualizar `apps/web/src/app/(dashboard)/dashboard/page.tsx` para exibir os limites do plano real (ex: "X/5 nestings realizados"). → Verify: O dashboard reflete os limites de uso baseados no plano do usuário.
- [ ] Task 4: Subir o banco de dados e aplicar migrações (`docker compose up -d db redis` e `make db-migrate`). → Verify: O backend se conecta sem erros ao PostgreSQL.
- [ ] Task 5: Validar fluxo de Webhooks localmente (opcional/se necessário testar pagamento) usando Stripe CLI e ngrok para Clerk. → Verify: Criar um usuário no Clerk insere a linha na tabela `users` do banco local.
- [ ] Task 6: Rodar auditorias finais (`make test` e linting) para garantir estabilidade. → Verify: Todos os testes passam (verde).

## Done When
- [ ] O usuário consegue ver seu plano correto na página de Ajustes.
- [ ] O banco de dados PostgreSQL está rodando e persistindo Nestings, Retalhos e Usuários.
- [ ] Todos os testes do backend passam e a aplicação não possui erros críticos de build.
