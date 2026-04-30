# MOLDURIZE Agent Agency

Esta pasta define a agencia operacional de agentes para o projeto MOLDURIZE WEB.
Ela nao substitui os agentes genericos em `.agent/agents`; ela cria uma camada
especifica do produto, com papeis, autoridade, escopos de escrita e rituais de
controle de qualidade.

## Objetivo

Organizar o trabalho futuro em times especializados sem perder controle tecnico:

- planejar antes de codar;
- dividir tarefas sem conflito de arquivos;
- validar cada entrega com testes reais;
- manter seguranca, billing, dados e UX como gates obrigatorios;
- transformar os proximos passos do MVP em execucao coordenada.

## Arquivos

- `registry.md` - organograma, papeis, responsabilidades e escopos.
- `operating-model.md` - como a agencia trabalha no dia a dia.
- `dispatch-prompts.md` - prompts prontos para enviar tarefas aos agentes.
- `quality-gates.md` - checklist de aceite por tipo de mudanca.
- `next-steps-mvp.md` - plano recomendado para as proximas rodadas.

## Regra principal

Nenhum agente deve editar fora do seu escopo autorizado. Se dois agentes
precisarem tocar o mesmo arquivo, a tarefa vira sequencial ou vai para uma branch
separada.

## Modelo de decisao

1. Product Owner define prioridade e aceite.
2. Project Planner quebra em tarefas pequenas.
3. Tech Lead distribui por escopo.
4. Especialistas executam.
5. QA, Security e Reviewer validam.
6. Tech Lead integra e reporta.

## Estado atual conhecido

O fluxo de conta/plano foi avancado com:

- `/api/v1/me`;
- uso real em Settings/Dashboard;
- limitacao de nesting por plano;
- owner-scope em detalhes de nesting;
- checkout enviando `clerk_id`;
- contraste do Historico corrigido.

O bloqueio operacional mais importante agora e banco local/producao acessivel:
a API subiu em `:8001`, mas o `DATABASE_URL` atual falhou ao resolver o host.
