# G-Code regression against devFoam

Este estudo registra o criterio atual para evoluir o gerador de G-Code sem
quebrar a compatibilidade com o arquivo de referencia do devFoam.

## Referencia

- Arquivo original recebido: `C:\Users\jonat\Downloads\devoam.nc`
- Fixture versionada: `apps/api/tests/fixtures/gcode/devfoam_banded_reference.nc`
- Estrategia Moldurize correspondente: `devfoam_banded`
- Estrategia padrao da API/app: `devfoam_auto`
- Dialeto alvo: `G21`, `G17`, `G90`, `F800.0000`, `M3`, movimentos `G1` compactos e eixos `X/Y/Z/A`
- Regra de maquina: `X == Z` e `Y == A` para corte 2D sincronizado no fio quente

## Aceite atual

Para o lote de referencia, o Moldurize deve manter:

- 1304 linhas totais
- 1298 movimentos `G1`
- 0 movimentos `G1` consecutivos duplicados
- 0 erros de espelhamento entre `X/Z` e `Y/A`
- mesmo envelope de corte: `X 0.0..1004.002`, `Y 0.0..1185.5541`
- delta maximo por sequencia `G1` de `0.0001 mm`
- delta maximo de distancia XY total de `0.01 mm`

O primeiro arquivo comparado ficou com diferenca textual apenas por arredondamento:
`76797.7790 mm` no devFoam contra `76797.7740 mm` no Moldurize.

## Como validar

Rodar a suite principal do backend:

```powershell
python -m pytest apps\api\tests -q
```

Comparar dois arquivos manualmente:

```powershell
python apps\api\gcode_compare.py `
  "C:\Users\jonat\Downloads\devoam.nc" `
  "C:\Users\jonat\Downloads\moldurize_vs_devoam_banded.nc" `
  --require-same-counts `
  --require-clean-candidate `
  --max-g1-delta 0.0001 `
  --max-distance-delta 0.01
```

## Proximas melhorias do gerador

1. Expandir fixtures para mais geometrias reais: uma coluna, duas colunas,
   multiplas colunas, pecas com dimensoes diferentes e blocos multiplos.
2. Expor no app um painel de validacao do G-Code com contagem de linhas,
   distancia, duplicados, espelhamento e envelope antes de baixar o arquivo.
3. Separar estrategias em modulos menores quando novos padroes de corte forem
   adicionados.
