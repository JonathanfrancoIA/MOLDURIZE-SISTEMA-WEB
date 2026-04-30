# Operating Model

## Como iniciar uma rodada

1. Definir objetivo em uma frase.
2. Listar arquivos permitidos por agente.
3. Declarar criterio de aceite verificavel.
4. Disparar agentes somente se os escopos nao colidem.
5. Revisar diff antes de aceitar.
6. Rodar verificacoes finais no workspace principal.
7. Atualizar status e proximos passos.

## Estrategias de particionamento

### Por camada

Padrao para MOLDURIZE.

- Backend Specialist: `apps/api/**`
- Frontend Specialist: `apps/web/**`
- Shared Contract Specialist: `packages/shared/**`
- DevOps Engineer: Docker, CI, Makefile, env examples
- Documentation Writer: docs e agencia

Use quando backend e frontend podem trabalhar em paralelo com contrato claro.

### Sequencial

Use quando varios agentes precisariam tocar os mesmos arquivos.

Exemplos:
- uma mesma pagina React;
- uma mesma migration;
- refactor do client API compartilhado.

### Por branch

Use quando duas abordagens competem ou ha risco alto de conflito.

Padrao de branch:
- `codex/<tema>`
- `antigravity/<tema>`

## Handoff obrigatorio

Todo agente deve responder com:

- arquivos alterados;
- resumo objetivo;
- comando de validacao executado;
- output relevante;
- riscos restantes.

## Correction loop

Se o trabalho vier errado:

1. Cite arquivo e linha.
2. Descreva comportamento errado.
3. Diga o comportamento esperado.
4. Peca re-run do comando de verificacao.

Nao aceite "corrijo depois".

## Definition of Done por batch

Um batch so esta pronto quando:

- escopo respeitado;
- diff revisado;
- testes/lint/build passam;
- contrato backend/frontend confere;
- riscos residuais documentados;
- nenhum processo necessario ficou rodando sem aviso.

## Quando pausar para decisao humana

Pausar antes de:

- mudar billing real;
- rodar deploy;
- alterar schema com dados reais;
- apagar historico;
- adicionar dependencia paga;
- trocar arquitetura principal.

## Cadencia recomendada

### Daily tecnico rapido

- O que mudou desde a ultima rodada?
- O que quebrou ou ficou incerto?
- Qual e o proximo menor lote verificavel?

### Pre-release

- DB conectado;
- migrations aplicadas;
- auth real testado;
- Stripe webhook testado;
- Clerk webhook testado;
- fluxo nesting -> historico -> gcode validado;
- build e tests verdes.

## Politica de qualidade

Codigo que compila mas nao cumpre contrato de runtime nao passa.
Exemplo: frontend usando campos opcionais que o backend nao devolve.
