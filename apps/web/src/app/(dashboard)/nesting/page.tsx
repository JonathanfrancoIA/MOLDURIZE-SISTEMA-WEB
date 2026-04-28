"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  Box,
  Cpu,
  Download,
  FileCode2,
  Gauge,
  Layers3,
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

type EditablePart = Required<Pick<PartInput, "width" | "height" | "quantity">> & {
  id: string;
  label: string;
};

type GCodeStrategy = "devfoam_auto" | "devfoam_shared" | "devfoam_banded";

const initialParts: EditablePart[] = [
  { id: "p1", label: "Moldura A", width: 600, height: 80, quantity: 12 },
  { id: "p2", label: "Moldura B", width: 420, height: 120, quantity: 8 },
  { id: "p3", label: "Calco", width: 300, height: 200, quantity: 6 },
];

export default function NestingPage() {
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
  const [gcodeLoading, setGcodeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-black/10 bg-white/85 shadow-[0_24px_70px_-52px_rgba(23,23,19,0.45),inset_0_1px_0_rgba(255,255,255,0.9)]">
        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-7 items-center gap-2 rounded-md border border-[#c9952f]/30 bg-[#fff5da] px-2.5 text-xs font-bold text-[#8b651f]">
                <Scissors className="h-3.5 w-3.5" strokeWidth={1.8} />
                hot-wire workbench
              </span>
              <span className="text-xs font-medium text-[#817b6d]">devFoam-style G-Code</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#171713] md:text-3xl">Nesting EPS</h1>
            <p className="mt-1 max-w-[64ch] text-sm leading-6 text-[#625f55]">
              Configure o lote, visualize o bloco em escala e gere saida X/Y/Z/A para fio quente.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[600px]">
            <Metric label="Pecas" value={totalPieces.toString()} icon={<Layers3 className="h-4 w-4" />} />
            <Metric label="Blocos" value={result ? result.total_blocks.toString() : "-"} icon={<Box className="h-4 w-4" />} />
            <Metric label="Efic." value={result ? `${efficiency.toFixed(1)}%` : "-"} icon={<Gauge className="h-4 w-4" />} tone="accent" />
            <Metric label="G-Code" value={gcodeLineCount ? `${gcodeLineCount} linhas` : "-"} icon={<FileCode2 className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:max-h-[calc(100dvh-7rem)] xl:self-start xl:overflow-y-auto xl:pr-2">
          <Panel title="Materia-prima" icon={<Box className="h-4 w-4" strokeWidth={1.8} />}>
            <div className="space-y-3">
              <TextInput label="Projeto" value={projectName} onChange={setProjectName} />
              <div className="grid grid-cols-3 gap-2">
                <NumberInput label="Largura" value={blockWidth} onChange={setBlockWidth} suffix="mm" />
                <NumberInput label="Altura" value={blockHeight} onChange={setBlockHeight} suffix="mm" />
                <NumberInput label="Kerf" value={kerf} onChange={setKerf} suffix="mm" step={0.1} />
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
              {parts.map((part) => (
                <div key={part.id} className="rounded-md border border-black/10 bg-[#fbfaf6] p-3">
                  <div className="mb-3 flex items-center gap-2">
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
              ))}
            </div>

            <button
              type="button"
              onClick={runNesting}
              disabled={loading}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#171713] px-4 text-sm font-semibold text-[#f2c767] shadow-[0_16px_34px_-24px_rgba(0,0,0,0.65)] transition-all duration-200 hover:bg-[#2a281f] disabled:cursor-not-allowed disabled:opacity-60 active:-translate-y-[1px]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scissors className="h-4 w-4" strokeWidth={1.8} />}
              {loading ? "Calculando" : "Calcular nesting"}
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
              <div className="flex flex-wrap gap-2">
                {blockIndexes.map((block) => (
                  <button
                    key={block}
                    type="button"
                    onClick={() => setActiveBlock(block)}
                    className={`h-8 rounded-md border px-3 text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
                      activeBlock === block
                        ? "border-[#f2c767] bg-[#f2c767] text-[#171713]"
                        : "border-white/12 bg-white/[0.04] text-white/62 hover:border-white/28 hover:text-white"
                    }`}
                  >
                    B{block + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative h-[540px] lg:h-[620px]">
              {loading && <CanvasLoading />}
              <NestingCanvas
                blockWidth={blockWidth}
                blockHeight={blockHeight}
                placedParts={result?.placed_parts ?? []}
                activeBlockIndex={activeBlock}
              />
            </div>
          </main>

          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-[360px_minmax(0,1fr)]">
            <Panel title="Maquina 4 eixos" icon={<Settings2 className="h-4 w-4" strokeWidth={1.8} />}>
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
              <div className="mt-3 grid grid-cols-2 gap-2">
                <NumberInput label="Feed" value={feedRate} onChange={setFeedRate} suffix="mm/min" />
                <NumberInput label="Clearance" value={clearance} onChange={setClearance} suffix="mm" step={0.5} />
                <NumberInput label="Gap bloco" value={blockGap} onChange={setBlockGap} suffix="mm" />
                <NumberInput label="Fio" value={wireTemp} onChange={setWireTemp} suffix="%" />
                <NumberInput label="Lead-in" value={leadIn} onChange={setLeadIn} suffix="mm" step={0.5} />
                <NumberInput label="Raio canto" value={cornerRadius} onChange={setCornerRadius} suffix="mm" step={0.1} />
              </div>
              <label className="mt-3 block">
                <span className="mb-1.5 block text-xs font-semibold text-[#625f55]">Sequencia</span>
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

function Metric({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "default" | "accent";
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-[#fbfaf6] px-3 py-2.5 shadow-[0_14px_28px_-24px_rgba(0,0,0,0.35)]">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[#928b7c]">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em]">{label}</div>
        <span className={tone === "accent" ? "text-[#c9952f]" : "text-[#aaa493]"}>{icon}</span>
      </div>
      <div className={`font-mono text-base font-bold ${tone === "accent" ? "text-[#8b651f]" : "text-[#171713]"}`}>
        {value}
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#625f55]">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-black/10 bg-white px-3 text-sm text-[#171713] outline-none transition-colors focus:border-[#c9952f]/70"
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
