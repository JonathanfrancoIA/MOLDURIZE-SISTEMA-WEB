"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Box,
  Cpu,
  Download,
  FileCode2,
  Loader2,
  Plus,
  Ruler,
  Scissors,
  Settings2,
  Trash2,
  Zap,
} from "lucide-react";
import {
  ApiClientError,
  createApiClient,
  type MachineProfile,
  type NestingResponse,
  type PartInput,
} from "@moldurize/shared";
import { NestingCanvas } from "@/components/nesting";
import { DxfImportModal } from "@/components/DxfImportModal";

type EditablePart = Required<Pick<PartInput, "width" | "height" | "quantity">> & {
  id: string;
  label: string;
};

type GCodeStrategy = "devfoam_auto" | "devfoam_shared" | "devfoam_banded";

const PART_PALETTE = [
  { fill: "#c9952f", highlight: "#e0b85c", text: "#1b160b" },
  { fill: "#b87333", highlight: "#d49157", text: "#1b160b" },
  { fill: "#7a9a6e", highlight: "#96b388", text: "#1b1e17" },
  { fill: "#c4956a", highlight: "#d9b08c", text: "#1b160b" },
  { fill: "#5e8585", highlight: "#7da3a3", text: "#f0ede6" },
  { fill: "#c4a882", highlight: "#d9c4a6", text: "#1b160b" },
  { fill: "#8a6b3f", highlight: "#a88a5c", text: "#f0ede6" },
  { fill: "#a0522d", highlight: "#bf7040", text: "#f0ede6" },
];

function getPartColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = ((hash << 5) - hash + label.charCodeAt(i)) | 0;
  }
  return PART_PALETTE[Math.abs(hash) % PART_PALETTE.length];
}

const initialParts: EditablePart[] = [
  { id: "p1", label: "Moldura A", width: 600, height: 80, quantity: 12 },
  { id: "p2", label: "Moldura B", width: 420, height: 120, quantity: 8 },
  { id: "p3", label: "Calco", width: 300, height: 200, quantity: 6 },
];

export default function NestingPage() {
  return (
    <Suspense fallback={
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9952f] mb-4" />
        <p className="text-sm font-semibold text-[#625f55]">Carregando projeto...</p>
      </div>
    }>
      <NestingContent />
    </Suspense>
  );
}

function NestingContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { getToken } = useAuth();
  const api = useMemo(
    () =>
      createApiClient({
        baseUrl:
          process.env.NEXT_PUBLIC_API_URL ||
          (typeof window !== "undefined"
            ? window.location.origin.replace(/:\d+$/, ":8001")
            : "http://localhost:8001"),
        getAuthToken: async () => {
          try {
            return await getToken();
          } catch {
            return null;
          }
        },
      }),
    [getToken]
  );

  const [projectName, setProjectName] = useState("Lote EPS");
  const [parts, setParts] = useState<EditablePart[]>(initialParts);
  const [blockWidth, setBlockWidth] = useState(4000);
  const [blockHeight, setBlockHeight] = useState(1200);
  const [kerf, setKerf] = useState(3);
  const [activeBlock, setActiveBlock] = useState(0);
  const [result, setResult] = useState<NestingResponse | null>(null);
  const [gcode, setGcode] = useState("");
  const [machineProfile, setMachineProfile] = useState<MachineProfile>("mach3");
  const [feedRate, setFeedRate] = useState(800);
  const [clearance, setClearance] = useState(10);
  const [wireTemp, setWireTemp] = useState(80);
  const [leadIn, setLeadIn] = useState(0);
  const [blockGap, setBlockGap] = useState(50);
  const [cornerRadius, setCornerRadius] = useState(0.5);
  const [gcodeStrategy, setGcodeStrategy] = useState<GCodeStrategy>("devfoam_auto");
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(!!id);
  const [gcodeLoading, setGcodeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDxfModalOpen, setIsDxfModalOpen] = useState(false);

  const totalPieces = useMemo(
    () => parts.reduce((sum, part) => sum + Math.max(0, Number(part.quantity) || 0), 0),
    [parts]
  );

  const blockIndexes = useMemo(() => {
    if (!result) return [0];
    const indexes = Array.from(new Set(result.placed_parts.map((part) => part.block_index)));
    return indexes.length ? indexes.sort((a, b) => a - b) : [0];
  }, [result]);

  const visibleParts = useMemo(
    () => result?.placed_parts.filter((part) => part.block_index === activeBlock) ?? [],
    [result, activeBlock]
  );

  const gcodeLineCount = useMemo(() => {
    if (!gcode) return 0;
    return gcode.split(/\r?\n/).filter(Boolean).length;
  }, [gcode]);

  useEffect(() => {
    if (!blockIndexes.includes(activeBlock)) {
      setActiveBlock(blockIndexes[0] ?? 0);
    }
  }, [activeBlock, blockIndexes]);

  useEffect(() => {
    if (!id) return;
    setInitialLoad(true);
    setError(null);
    api.getNesting(id)
      .then((res) => {
        setProjectName(res.name || "Projeto Salvo");
        setBlockWidth(res.block_width);
        setBlockHeight(res.block_height);
        if (res.kerf) setKerf(res.kerf);

        if (res.parts_input && Array.isArray(res.parts_input)) {
          setParts(res.parts_input.map((p, i) => ({
            id: `p${i}_${Date.now()}`,
            label: p.label || `Peça ${i+1}`,
            width: p.width,
            height: p.height,
            quantity: p.quantity ?? 1,
          })));
        }

        setResult(res);
      })
      .catch((err) => {
        if (err instanceof ApiClientError && err.status === 404) {
          setError("Projeto não encontrado.");
        } else {
          setError(formatError(err, "Erro ao carregar projeto."));
        }
      })
      .finally(() => setInitialLoad(false));
  }, [id, api]);

  function updatePart(id: string, field: keyof EditablePart, value: string | number) {
    setParts((current) =>
      current.map((part) =>
        part.id === id
          ? {
              ...part,
              [field]:
                field === "label"
                  ? String(value)
                  : Math.max(field === "quantity" ? 1 : 0, Number(value) || 0),
            }
          : part
      )
    );
  }

  function addPart() {
    setParts((current) => [
      ...current,
      {
        id: `p${Date.now()}`,
        label: `Peca ${current.length + 1}`,
        width: 500,
        height: 100,
        quantity: 1,
      },
    ]);
  }

  function removePart(id: string) {
    setParts((current) => current.filter((part) => part.id !== id));
  }

  function buildRequestParts(): PartInput[] {
    return parts.map(({ width, height, quantity, label }) => ({
      width: Number(width),
      height: Number(height),
      quantity: Number(quantity),
      label: label.trim() || undefined,
    }));
  }

  function handleDxfImport(importedParts: Array<{ label: string; width: number; height: number; quantity: number }>) {
    setParts(current => [
      ...current,
      ...importedParts.map((p, i) => ({
        id: `dxf_${Date.now()}_${i}`,
        label: p.label,
        width: p.width,
        height: p.height,
        quantity: p.quantity,
      })),
    ]);
  }

  async function runNesting() {
    const requestParts = buildRequestParts();
    if (!requestParts.length || requestParts.some((part) => part.width <= 0 || part.height <= 0 || !part.quantity)) {
      setError("Revise as pecas antes de calcular.");
      return;
    }

    setLoading(true);
    setError(null);
    setGcode("");
    try {
      const response = await api.optimize({
        name: projectName || undefined,
        parts: requestParts,
        block: { width: blockWidth, height: blockHeight, kerf },
      });
      setResult(response);
      setActiveBlock(0);
    } catch (err) {
      setError(formatError(err, "Erro ao calcular nesting."));
    } finally {
      setLoading(false);
    }
  }

  function buildGCodeRequest() {
    if (!result) return null;
    return {
      pieces: result.placed_parts.map((part) => ({
        x: part.x,
        y: part.y,
        width: part.width,
        height: part.height,
        block_index: part.block_index,
        label: part.label,
      })),
      block_width: result.block_width,
      block_height: result.block_height,
      config: {
        feed_rate: feedRate,
        clearance,
        origin_x: 0,
        origin_y: 0,
        wire_temp: wireTemp,
        lead_in_length: leadIn,
        block_gap: blockGap,
        output_style: "devfoam" as const,
        corner_radius: cornerRadius,
        corner_segments: 3,
      },
      machine_profile: machineProfile,
      strategy: gcodeStrategy,
    };
  }

  async function generateGCode() {
    const request = buildGCodeRequest();
    if (!request) return;
    setGcodeLoading(true);
    setError(null);
    try {
      const content = await api.generateGCode(request);
      setGcode(content);
    } catch (err) {
      setError(formatError(err, "Erro ao gerar G-Code."));
    } finally {
      setGcodeLoading(false);
    }
  }

  async function downloadGCode() {
    const request = buildGCodeRequest();
    if (!request) return;
    setGcodeLoading(true);
    setError(null);
    try {
      const blob = await api.downloadGCode(request);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${projectName || "moldurize"}-cut.nc`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(formatError(err, "Erro ao baixar G-Code."));
    } finally {
      setGcodeLoading(false);
    }
  }

  const efficiency = result ? 100 - result.waste_percent : 0;

  // Aspect-ratio proporcional ao bloco (limitado entre 1.2 e 3.0 para nao exagerar)
  const rawRatio = blockWidth / blockHeight;
  const clampedRatio = Math.min(Math.max(rawRatio, 1.2), 3.0);
  const efficiencyColor = !result
    ? "text-[#625f55]"
    : efficiency >= 85
      ? "text-[#2d7a3a]"
      : efficiency >= 60
        ? "text-[#a68b1a]"
        : "text-[#c9522f]";

  // Piece count per block for tabs
  const piecesPerBlock = useMemo(() => {
    if (!result) return new Map<number, number>();
    const counts = new Map<number, number>();
    for (const part of result.placed_parts) {
      counts.set(part.block_index, (counts.get(part.block_index) || 0) + 1);
    }
    return counts;
  }, [result]);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-black/8 bg-white/90 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-6 items-center gap-1.5 rounded border border-[#c9952f]/25 bg-[#fff8e6] px-2 text-[10px] font-bold uppercase tracking-wider text-[#8b651f]">
                <Scissors className="h-3 w-3" strokeWidth={2} />
                hot-wire
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[#171713] md:text-2xl">Nesting EPS</h1>
            <p className="mt-0.5 max-w-[56ch] text-[13px] leading-5 text-[#817b6d]">
              Configure o lote, visualize o bloco em escala e gere G-Code 4 eixos.
            </p>
          </div>

          <div className="flex items-end gap-6 lg:gap-8">
            {/* Hero KPI: Efficiency */}
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#928b7c]">Eficiencia</div>
              <div className={`font-mono text-3xl font-extrabold tracking-tight ${efficiencyColor}`}>
                {result ? `${efficiency.toFixed(1)}%` : "--"}
              </div>
            </div>

            {/* Secondary metrics inline */}
            <div className="flex gap-4 border-l border-black/8 pl-6 text-right">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#928b7c]">Pecas</div>
                <div className="font-mono text-sm font-bold text-[#171713]">{totalPieces}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#928b7c]">Blocos</div>
                <div className="font-mono text-sm font-bold text-[#171713]">{result ? result.total_blocks : "--"}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#928b7c]">G-Code</div>
                <div className="font-mono text-sm font-bold text-[#171713]">{gcodeLineCount || "--"}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
          {error === "Projeto não encontrado." && (
            <> {" "}
              <a href="/nesting" className="underline font-semibold hover:text-red-600">
                Criar novo projeto
              </a>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:self-start xl:overflow-y-auto xl:pr-2">
          <Panel title="Materia-prima" icon={<Box className="h-4 w-4" strokeWidth={1.8} />}>
            <div className="space-y-4">
              <TextInput label="Nome do Projeto" value={projectName} onChange={setProjectName} placeholder="Ex: Lote de molduras" />
              <div className="grid grid-cols-3 gap-2">
                <NumberInput label="Largura" value={blockWidth} onChange={setBlockWidth} suffix="mm" />
                <NumberInput label="Altura" value={blockHeight} onChange={setBlockHeight} suffix="mm" />
                <NumberInput label="Kerf" value={kerf} onChange={setKerf} suffix="mm" step={0.1} />
              </div>

              <div className="border-t border-black/10 pt-4">
                <h3 className="text-xs font-bold text-[#625f55] mb-3 uppercase tracking-wider">Importar referências</h3>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsDxfModalOpen(true)}
                    className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-md border-2 border-dashed border-black/20 bg-[#f7f4ec] px-4 text-xs font-semibold text-[#625f55] transition-all duration-200 hover:border-[#c9952f]/60 hover:text-[#171713] hover:bg-[#fffcf5] active:scale-[0.98]"
                    title="Selecione um arquivo DXF para importar peças automaticamente"
                  >
                    <FileCode2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Importar DXF
                  </button>
                  <button
                    type="button"
                    onClick={() => setError("Importação de imagem estará disponível em breve.")}
                    className="w-full inline-flex h-10 items-center justify-center gap-2 rounded-md border-2 border-dashed border-black/20 bg-[#f7f4ec] px-4 text-xs font-semibold text-[#625f55] transition-all duration-200 hover:border-[#c9952f]/60 hover:text-[#171713] hover:bg-[#fffcf5] active:scale-[0.98]"
                    title="Carregue uma imagem como referência de layout"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Importar Imagem
                  </button>
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Pecas do lote"
            icon={<Ruler className="h-4 w-4" strokeWidth={1.8} />}
            action={
              <button
                type="button"
                onClick={addPart}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black/10 bg-[#f7f4ec] px-2.5 text-xs font-semibold text-[#625f55] transition-all duration-200 hover:border-[#c9952f]/50 hover:text-[#171713] active:-translate-y-[1px]"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.8} />
                Adicionar
              </button>
            }
          >
            <div className="max-h-[392px] space-y-3 overflow-auto pr-1">
              {parts.map((part) => {
                const color = getPartColor(part.label);
                return (
                <div key={part.id} className="rounded-md border border-black/10 bg-[#fbfaf6] p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-12 shrink-0 items-center justify-center rounded-md border border-black/10 bg-[#efe7d1] p-1.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
                      <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(part.width, 1)} ${Math.max(part.height, 1)}`} preserveAspectRatio="xMidYMid meet">
                        <rect width={part.width} height={part.height} fill={color.fill} stroke="#1b160b" strokeWidth={Math.max(part.width, part.height) * 0.02} />
                        <rect width={part.width} height={Math.max(part.height * 0.15, 1)} fill={color.highlight} opacity="0.6" />
                      </svg>
                    </div>
                    <input
                      value={part.label}
                      onChange={(event) => updatePart(part.id, "label", event.target.value)}
                      className="min-w-0 flex-1 rounded-md border border-black/10 bg-white px-2.5 py-2 text-sm font-semibold text-[#171713] outline-none transition-colors placeholder:text-[#aaa493] focus:border-[#c9952f]/70"
                    />
                    <button
                      type="button"
                      onClick={() => removePart(part.id)}
                      disabled={parts.length === 1}
                      className="flex h-9 w-9 items-center justify-center rounded-md border border-black/10 text-[#817b6d] transition-all duration-200 hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-35 active:scale-[0.98]"
                      title="Remover peca"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <NumberInput compact label="L" value={part.width} onChange={(value) => updatePart(part.id, "width", value)} />
                    <NumberInput compact label="A" value={part.height} onChange={(value) => updatePart(part.id, "height", value)} />
                    <NumberInput compact label="Qtd" value={part.quantity} onChange={(value) => updatePart(part.id, "quantity", value)} />
                  </div>
                </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={runNesting}
              disabled={loading || initialLoad}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#171713] px-4 text-sm font-semibold text-[#f2c767] shadow-[0_16px_34px_-24px_rgba(0,0,0,0.65)] transition-all duration-200 hover:bg-[#2a281f] disabled:cursor-not-allowed disabled:opacity-60 active:-translate-y-[1px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" strokeWidth={1.8} />}
              {id ? (loading ? "Recalculando..." : "Nova Otimização") : (loading ? "Calculando..." : "Calcular nesting")}
            </button>
          </Panel>
        </aside>

        <section className="min-w-0 space-y-4">
          <main className="overflow-hidden rounded-lg border border-black/10 bg-[#171713] shadow-[0_24px_80px_-58px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-white">Mapa do bloco</h2>
                <p className="text-xs text-white/48">
                  {result ? `${visibleParts.length} pecas no bloco ${activeBlock + 1}` : "Calcule para visualizar o encaixe"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {blockIndexes.map((block) => {
                  const count = piecesPerBlock.get(block) || 0;
                  return (
                    <button
                      key={block}
                      type="button"
                      onClick={() => setActiveBlock(block)}
                      className={`h-7 rounded-md border px-2.5 font-mono text-[11px] font-semibold transition-all duration-200 active:scale-[0.97] ${
                        activeBlock === block
                          ? "border-[#f2c767] bg-[#f2c767] text-[#171713]"
                          : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      B{block + 1}{count > 0 ? ` (${count})` : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="relative w-full"
              style={{ paddingBottom: `${(1 / clampedRatio) * 100}%`, minHeight: 320, maxHeight: 680 }}
            >
              <div className="absolute inset-0">
                {(loading || initialLoad) && <CanvasLoading />}
                <NestingCanvas
                  blockWidth={blockWidth}
                  blockHeight={blockHeight}
                  placedParts={result?.placed_parts ?? []}
                  activeBlockIndex={activeBlock}
                />
              </div>
            </div>
          </main>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
            <Panel title="Maquina 4 eixos" icon={<Settings2 className="h-4 w-4" strokeWidth={1.8} />}>
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-[#625f55]">Perfil CNC</span>
                  <select
                    value={machineProfile}
                    onChange={(event) => setMachineProfile(event.target.value as MachineProfile)}
                    className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-[#171713] outline-none transition-colors focus:border-[#c9952f]/70"
                  >
                    <option value="mach3">Mach3</option>
                    <option value="planet_cnc">PlanetCNC</option>
                    <option value="grbl">GRBL</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <NumberInput label="Feed" value={feedRate} onChange={setFeedRate} suffix="mm/min" />
                  <NumberInput label="Fio" value={wireTemp} onChange={setWireTemp} suffix="%" />
                </div>
                
                <details className="group rounded-md border border-black/10 bg-white overflow-hidden">
                  <summary className="flex cursor-pointer items-center justify-between bg-[#fbfaf6] px-3 py-2 text-xs font-bold text-[#625f55] hover:bg-[#f7f4ec] select-none">
                    <span>AVANCADO</span>
                    <svg className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </summary>
                  <div className="p-3 border-t border-black/10">
                    <div className="grid grid-cols-2 gap-2">
                      <NumberInput label="Clearance" value={clearance} onChange={setClearance} suffix="mm" step={0.5} />
                      <NumberInput label="Gap bloco" value={blockGap} onChange={setBlockGap} suffix="mm" />
                      <NumberInput label="Lead-in" value={leadIn} onChange={setLeadIn} suffix="mm" step={0.5} />
                      <NumberInput label="Raio canto" value={cornerRadius} onChange={setCornerRadius} suffix="mm" step={0.1} />
                    </div>
                    <label className="mt-3 block">
                      <span className="mb-1.5 block text-xs font-semibold text-[#625f55]">Sequencia G-Code</span>
                      <select
                        value={gcodeStrategy}
                        onChange={(event) => setGcodeStrategy(event.target.value as GCodeStrategy)}
                        className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-[#171713] outline-none transition-colors focus:border-[#c9952f]/70"
                      >
                        <option value="devfoam_auto">devFoam automatico</option>
                        <option value="devfoam_shared">devFoam compartilhado</option>
                        <option value="devfoam_banded">devFoam faixas</option>
                      </select>
                    </label>
                  </div>
                </details>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/10 pt-3">
                <StatusItem label="Formato" value="devFoam" />
                <StatusItem label="Eixos" value={machineProfile === "grbl" ? "X/Y" : "X/Y/Z/A"} />
              </div>
            </Panel>

            <Panel title="G-Code" icon={<Cpu className="h-4 w-4" strokeWidth={1.8} />}>
              <div className="grid grid-cols-2 gap-2 md:flex md:justify-end">
                <button
                  type="button"
                  onClick={generateGCode}
                  disabled={!result || gcodeLoading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c9952f]/45 bg-[#fff5da] px-5 text-sm font-semibold text-[#8b651f] transition-all duration-200 hover:bg-[#fbe8ad] disabled:cursor-not-allowed disabled:opacity-40 active:-translate-y-[1px]"
                >
                  {gcodeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" strokeWidth={1.8} />}
                  Gerar
                </button>
                <button
                  type="button"
                  onClick={downloadGCode}
                  disabled={!result || gcodeLoading}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-5 text-sm font-semibold text-[#625f55] transition-all duration-200 hover:border-black/20 hover:text-[#171713] disabled:cursor-not-allowed disabled:opacity-40 active:-translate-y-[1px]"
                >
                  <Download className="h-4 w-4" strokeWidth={1.8} />
                  Baixar
                </button>
              </div>

              <div className="mt-4 h-[300px] overflow-auto rounded-md border border-black/10 bg-[#10110f] p-3">
                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#e8dfca]">
                  {gcode || "Aguardando geracao"}
                </pre>
              </div>
            </Panel>
          </div>
        </section>
      </div>

      <DxfImportModal
        isOpen={isDxfModalOpen}
        onClose={() => setIsDxfModalOpen(false)}
        onImport={handleDxfImport}
        api={api}
      />
    </div>
  );
}

function formatError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return `${fallback} ${error.message}`;
  if (error instanceof Error) return `${fallback} ${error.message}`;
  return fallback;
}

function Panel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-black/10 bg-white/88 p-4 shadow-[0_18px_48px_-38px_rgba(23,23,19,0.42),inset_0_1px_0_rgba(255,255,255,0.95)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-[#171713]">
          <span className="text-[#c9952f]">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

// Metric component removed -- replaced by inline KPI layout in header

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#625f55]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-[#171713] outline-none transition-colors placeholder:text-[#aaa493] focus:border-[#c9952f]/70"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  step?: number;
  compact?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#625f55]">{label}</span>
      <div className="flex h-10 items-center rounded-md border border-black/10 bg-white transition-colors focus-within:border-[#c9952f]/70">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`min-w-0 flex-1 bg-transparent text-[#171713] outline-none ${compact ? "px-2 text-xs" : "px-3 text-sm"}`}
        />
        {suffix && <span className="shrink-0 pr-2 text-[10px] font-semibold text-[#928b7c]">{suffix}</span>}
      </div>
    </label>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#928b7c]">{label}</div>
      <div className="mt-1 font-mono text-xs font-bold text-[#171713]">{value}</div>
    </div>
  );
}

function CanvasLoading() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#171713]/72 backdrop-blur-sm">
      <div className="w-[280px] rounded-lg border border-white/10 bg-[#202018] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="mb-3 h-2 w-24 rounded bg-[#f2c767]/65" />
        <div className="space-y-2">
          <div className="h-2 rounded bg-white/12" />
          <div className="h-2 w-10/12 rounded bg-white/12" />
          <div className="h-2 w-7/12 rounded bg-white/12" />
        </div>
      </div>
    </div>
  );
}
