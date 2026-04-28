---
title: "Estudo UI/UX: Redesign da Barra Lateral de Setup"
agent: "frontend-specialist"
status: "WAITING_APPROVAL"
---

## 1. Análise do Problema (Diagnóstico "Amador")
A atual barra escura posicionada no lado esquerdo da aplicação possui as seguintes falhas graves de design:
* **Clipping (Corte) Horizontal:** Os botões "Limpar" e "Enviar G-Code" têm larguras fixas (ex: `width=120`) que somados ultrapassam a largura física da barra. O Tkinter corta o restante.
* **Falta de Responsividade Vertical:** Conforme adicionamos componentes, a barra fica exprimida sem barra de rolagem. Telas menores perdem ferramentas.
* **Hierarquia Confusa:** As ações de "Importar DXF e CSV" estão "flutuando" com cara de botões secundários logo abaixo do manual, sem um bloco visual de separação.

## 2. Padrões Profissionais Adotados
Vamos transformar esse aglomerado de botões num **Painel de Controle Industrial**.

### Filosofia do Redesign:
1. **Cards (Blocos Visuais)**: Dividir a barra em três cartões com fundo levemente diferente (`NAVY_CARD`).
   * *Card 1*: Matéria-Prima (Bloco base e Kerf)
   * *Card 2*: Ingestão de Dados (Adição manual form + Imp. CSV + Imp. DXF em formato Full-Width).
   * *Card 3*: Controle de Corte (A caixa de Fila e os botões de ação).
2. **Scrollable Container**: O painel esquerdo deve ser um `CTkScrollableFrame` invisível, o que resolve 100% os problemas de corte e limitação para notebooks pequenos.
3. **Fluid Layout (Botões 100%)**: Em interfaces laterais apertadas, o padrão moderno é que todos os botões primários tomem 100% da largura (`fill="x"`), e botões duplos (Limpar/G-Code) dividam as colunas de forma fluida ou fiquem empilhados.

## 3. Caminhos de Implementação

Ofereceremos ao usuário duas propostas focadas na resolução desse Clipping e na melhora visual:
* **Proposta A:** *Cards Empilhados*. Tudo fica visível usando Scroll.
* **Proposta B:** *Abas (Tabview)*. "Cadastrar", "Importar" e "Fila" viram abas dentro do painel lateral, deixando ele minúsculo e focado.
