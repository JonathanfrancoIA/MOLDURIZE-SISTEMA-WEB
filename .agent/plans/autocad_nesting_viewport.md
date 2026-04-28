---
title: "Projeto de Viewport Profissional (AutoCAD-Style)"
agent: "orchestrator"
status: "APPROVED"
---

# 1. Objetivo
Transformar a atual visualização 2D do Nesting em um ambiente fluido, escalável e com UX de softwares de engenharia (DevFoam / AutoCAD), mantendo a performance leve do Python.

# 2. Requisitos Técnicos
1. **True Matrix Zoom**: Habilitar a rolagem da bolinha do mouse (`<MouseWheel>`) para aplicar um Zoom matemático que aproxima a imagem em direção à ponta do cursor, sem distorcer janelas.
2. **Infinite Pan**: Mover o mapa espacialmente com o botão central/direito.
3. **Crosshair Tracking (Mira)**: Cursor de cruz infinita que auxilia no alinhamento visual de pontas de peças. Desenhada em runtime para o Canvas.
4. **Live Coordinates HUD**: Label que acusa a projeção exata em (X, Y) Real durante o repouso do mouse.

# 3. Desenho da Arquitetura
A ferramenta padrão `Tkinter.Canvas` tem altíssimo desempenho para polígonos simples. O limitador de performance é a destruição/recriação de shapes no layout loop. 

A solução arquitetural "Zero-Lag":
- **Tagging Global**: Todo polígono ou grid é classificado com uma tag isolada (`scalable`).
- **Scale Transform**: Quando disparado o `MouseWheel`, aplicamos `canvas.scale("all", focus_x, focus_y, factor, factor)`. Isso muda instantaneamente a matriz matemática no backend sem gerar cálculos Python.
- **Overlay Tracking**: A "Mira" (Crosshair) escapa da escala. Apenas alteramos `canvas.coords()` que consome `0.5ms` de tempo de frame limitando perdas gráficas.

# 4. Benefícios Colaterais
As réguas de medição de "Trena" irão se manter precisas independente do grau do arranjo visual. O Canvas suportará milhares de vetores.

# 5. Execução em vesting_tab.py
- [x] Planejamento.
- [ ] Incorporar sistema de Crosshairs dinâmicas.
- [ ] MouseWheel true-zoom (`factor=1.1` e `factor=0.9`).
- [ ] Atualização do Tracking da Trena no HUD de Inspeção.
