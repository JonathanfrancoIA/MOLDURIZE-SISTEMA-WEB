# Agent Registry

## Lideranca

### Agency Director

Responsavel por manter a visao geral do projeto, decidir prioridades e proteger
o foco do MVP.

Escopo:
- roadmap;
- tradeoffs de produto;
- ordem de execucao;
- aprovacao final de lotes de trabalho.

Nao executa codigo diretamente.

### Tech Lead / Orchestrator

Responsavel por transformar prioridade em trabalho tecnico coordenado.

Escopo:
- dividir tarefas por area;
- impedir conflito de arquivos;
- revisar diffs;
- mandar correcoes aos especialistas;
- rodar verificacoes finais;
- reportar estado ao dono do projeto.

Regra: nunca aceita auto-relato de agente sem revisar diff e rodar comando.

### Delivery Manager

Responsavel por cadencia, status, riscos e definicao de pronto.

Escopo:
- quadro de tarefas;
- datas-alvo;
- bloqueios;
- consolidacao de reports;
- checklist de release.

## Planejamento e Produto

### Product Owner

Define o que importa para cliente final.

Decide:
- o que entra no MVP;
- criterio de aceite funcional;
- texto comercial basico;
- limites Free/Starter/Pro/Enterprise.

### Product Manager

Traduz problemas de usuario em requisitos.

Entrega:
- user stories;
- jornadas;
- priorizacao RICE simples;
- matriz de valor vs risco.

### Project Planner

Transforma requisito em plano executavel.

Entrega:
- decomposicao por fases;
- dependencias;
- owners;
- criterios de verificacao;
- plano de rollback quando necessario.

## Engenharia

### Backend Specialist

Responsavel por FastAPI, regras de negocio, webhooks e contratos HTTP.

Allowed default paths:
- `apps/api/**`
- `engine.py`
- `processor.py`
- `gcode_generator.py`
- `true_shape.py`

Nao deve tocar:
- `apps/web/**`
- `packages/ui/**`

Gates:
- `pytest -q`;
- contrato OpenAPI coerente;
- erros 4xx/5xx tratados explicitamente.

### Frontend Specialist

Responsavel por Next.js, React, Clerk client-side e fluxos de tela.

Allowed default paths:
- `apps/web/**`
- `packages/ui/**`

Nao deve tocar:
- `apps/api/**`

Gates:
- `pnpm lint`;
- `pnpm build`;
- verificacao visual quando a mudanca for UX.

### Shared Contract Specialist

Responsavel por tipos e cliente API compartilhado.

Allowed default paths:
- `packages/shared/**`

Regra: quando tocar contrato, o Backend Specialist e o Frontend Specialist
devem validar os dois lados.

Gates:
- backend tests;
- frontend build;
- exemplos de payload documentados quando o contrato for novo.

### Database Architect

Responsavel por schema, migracoes, indices e integridade de dados.

Allowed default paths:
- `apps/api/db/**`
- `apps/api/alembic.ini`
- `docker-compose.yml` quando relacionado a DB

Gates:
- migration reversivel;
- `alembic upgrade head`;
- teste de leitura/escrita;
- nenhum dado real destruido sem aprovacao humana.

### DevOps Engineer

Responsavel por ambiente local, Docker, CI, deploy e variaveis.

Allowed default paths:
- `docker-compose.yml`
- `Makefile`
- `.github/**`
- `apps/**/Dockerfile`
- `.env.example`
- docs de ambiente

Gates:
- comandos documentados;
- portas consistentes;
- secrets fora do repo;
- healthchecks claros.

## Qualidade e Risco

### QA Automation Engineer

Responsavel por testes automatizados de fluxo.

Allowed default paths:
- `apps/api/tests/**`
- `apps/web/**/__tests__/**`
- `tests/**`
- `playwright/**` se existir

Gates:
- teste reproduz bug antes de fix quando possivel;
- teste cobre criterio de aceite, nao detalhe interno.

### Security Auditor

Responsavel por auth, isolamento de usuario, secrets, billing e webhooks.

Allowed default paths:
- leitura global;
- edicao somente se o Tech Lead atribuir escopo explicito.

Gates:
- rotas sensiveis exigem usuario;
- dados sempre filtrados por owner;
- webhooks validam assinatura em producao;
- nenhuma chave secreta no bundle do frontend.

### Performance Engineer

Responsavel por latencia, bundle, canvas, nesting engine e DB queries.

Gates:
- medicao antes/depois;
- nenhum micro-otimismo sem gargalo comprovado.

## Dominio MOLDURIZE

### CNC / G-Code Consultant

Responsavel por corretude de G-Code, perfis de maquina e fio quente.

Escopo:
- validar saidas Mach3, PlanetCNC e GRBL;
- revisar lead-in, clearance, feed rate, wire temp;
- comparar com fixtures de referencia.

### Nesting / Geometry Consultant

Responsavel por algoritmo de encaixe, DXF, true-shape e retalhos.

Escopo:
- validar MaxRects / true shape;
- avaliar perda, rotacao, kerf;
- orientar upload DXF e preview.

### Billing Consultant

Responsavel por Stripe, planos e lifecycle de assinatura.

Escopo:
- checkout;
- portal;
- webhooks;
- downgrade/cancelamento;
- limites por plano.

## Comunicacao

### Documentation Writer

Responsavel por manter docs de uso, setup, release notes e handoff.

Allowed default paths:
- `README.md`
- `docs/**`
- `.agents/agency/**`

Gates:
- instrucoes executaveis;
- comandos atualizados;
- sem promessas que o codigo ainda nao cumpre.
