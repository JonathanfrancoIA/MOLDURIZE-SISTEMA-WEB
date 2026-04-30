"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { PieChart, TrendingUp, Scissors, Package, LayoutGrid, Clock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ApiClientError, createBrowserApiClient, type MeResponse, type NestingSummary, type Remnant } from "@/lib/api";

export default function DashboardPage() {
  if (hasClerkKey) {
    return <DashboardPageWithClerk />;
  }

  return <DashboardContent />;
}

const hasClerkKey =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("SUBSTITUA");

type DashboardLoadErrors = {
  nestings?: string;
  remnants?: string;
  account?: string;
};

function DashboardPageWithClerk() {
  const { getToken } = useAuth();
  const getAuthToken = useCallback(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken]);

  return <DashboardContent getAuthToken={getAuthToken} />;
}

function DashboardContent({
  getAuthToken,
}: {
  getAuthToken?: () => string | null | Promise<string | null>;
}) {
  const api = useMemo(() => createBrowserApiClient(getAuthToken), [getAuthToken]);
  const [nestings, setNestings] = useState<NestingSummary[]>([]);
  const [remnants, setRemnants] = useState<Remnant[]>([]);
  const [account, setAccount] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiOffline, setApiOffline] = useState(false);
  const [loadErrors, setLoadErrors] = useState<DashboardLoadErrors>({});

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setApiOffline(false);
      setLoadErrors({});
      const [nestResult, remResult, accountResult] = await Promise.allSettled([
        api.listNestings(),
        api.listRemnants("disponivel"),
        api.getMe(),
      ]);

      const nextErrors: DashboardLoadErrors = {};

      if (nestResult.status === "fulfilled") {
        setNestings(nestResult.value);
      } else {
        setNestings([]);
        nextErrors.nestings = formatLoadError(nestResult.reason, "Nao foi possivel carregar projetos.");
      }

      if (remResult.status === "fulfilled") {
        setRemnants(remResult.value);
      } else {
        setRemnants([]);
        nextErrors.remnants = formatLoadError(remResult.reason, "Nao foi possivel carregar retalhos.");
      }

      if (accountResult.status === "fulfilled") {
        setAccount(accountResult.value);
      } else {
        setAccount(null);
        nextErrors.account = formatLoadError(accountResult.reason, "Nao foi possivel carregar a conta.");
      }

      setLoadErrors(nextErrors);
      setApiOffline(Object.keys(nextErrors).length > 0);
      setLoading(false);
    }
    fetchAll();
  }, [api]);

  // Métricas calculadas dos dados reais
  const completedNestings = useMemo(
    () => nestings.filter((n) => n.status === "completed" && n.waste_percent != null),
    [nestings]
  );

  const avgEfficiency = useMemo(() => {
    if (!completedNestings.length) return null;
    const avg = completedNestings.reduce((sum, n) => sum + (100 - (n.waste_percent ?? 0)), 0) / completedNestings.length;
    return avg.toFixed(1);
  }, [completedNestings]);

  const totalBlocks = useMemo(
    () => completedNestings.reduce((sum, n) => sum + (n.total_blocks ?? 0), 0),
    [completedNestings]
  );

  const availableRemnants = remnants.filter((r) => r.status === "disponivel");
  const nestingsUsed = getUsageValue(account, "nestings") ?? nestings.length;
  const blocksUsed = getUsageValue(account, "blocks") ?? totalBlocks;
  const nestingsLimitText = formatLimit(account?.limits?.nestings_limit);
  const blocksLimitText = formatLimit(account?.limits?.blocks_limit);
  const usageUnavailable = !!loadErrors.account && !!loadErrors.nestings;

  return (
    <div className="min-h-full bg-[#f5f5f0] text-[#171713] p-6 overflow-y-auto">

      {/* ─── HEADER ─── */}
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171713] mb-1">Visão Geral</h1>
          <p className="text-[#625f55] text-sm">Acompanhe a eficiência da sua fábrica de EPS.</p>
        </div>
        <Link
          href="/nesting"
          className="inline-flex items-center gap-2 bg-[#171713] text-[#f2c767] font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-[#2a281f] transition-colors shadow-[0_12px_28px_-18px_rgba(0,0,0,0.55)]"
        >
          <Scissors className="w-4 h-4" />
          Novo Projeto de Corte
        </Link>
      </header>

      {/* API offline warning */}
      {apiOffline && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>API offline ou parcialmente indisponivel. Dados incompletos nao serao tratados como lista vazia. Inicie o backend com <code className="font-mono bg-amber-100 px-1 rounded">make dev-api</code>.</span>
        </div>
      )}

      {/* ─── METRICS GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">

        {/* Métrica 1 — Jobs processados */}
        <div className="bg-white border border-black/10 rounded-xl p-5 shadow-[0_14px_32px_-24px_rgba(0,0,0,0.18)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#c9952f] rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-[#928b7c] font-semibold text-xs uppercase tracking-widest">Uso de Nestings</h3>
            <span className="p-2 bg-[#f5f5f0] rounded-lg text-[#c9952f]">
              <LayoutGrid className="w-4 h-4" />
            </span>
          </div>
          {loading ? (
            <div className="h-10 w-20 bg-black/5 rounded animate-pulse" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-[#171713]">{nestingsUsed}</div>
                <span className="text-xs text-[#928b7c] font-mono">
                  {nestingsLimitText || "NESTINGS"}
                </span>
              </div>
              <div className="text-xs text-[#928b7c] mt-1">
                {loadErrors.nestings
                  ? "Historico indisponivel"
                  : `${completedNestings.length} concluidos | ${nestings.filter(n => n.status === "failed").length} com falha`}
              </div>
            </>
          )}
        </div>

        {/* Métrica 2 — Eficiência média */}
        <div className="bg-white border border-black/10 rounded-xl p-5 shadow-[0_14px_32px_-24px_rgba(0,0,0,0.18)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#171713] rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-[#928b7c] font-semibold text-xs uppercase tracking-widest">Eficiência Média</h3>
            <span className="p-2 bg-[#fff5da] rounded-lg text-[#c9952f]">
              <PieChart className="w-4 h-4" />
            </span>
          </div>
          {loading ? (
            <div className="h-10 w-24 bg-black/5 rounded animate-pulse" />
          ) : (
            <>
              <div className="text-3xl font-bold text-[#171713]">
                {avgEfficiency ? `${avgEfficiency}%` : "—"}
              </div>
              <div className="text-xs text-[#928b7c] mt-1">
                {loadErrors.nestings
                  ? "Historico indisponivel"
                  : avgEfficiency
                    ? `Alvo: 90.0% | ${parseFloat(avgEfficiency) >= 90 ? "Acima" : "Abaixo"}`
                    : "Calcule um nesting para ver"}
              </div>
            </>
          )}
        </div>

        {/* Métrica 3 — Blocos totais */}
        <div className="bg-white border border-black/10 rounded-xl p-5 shadow-[0_14px_32px_-24px_rgba(0,0,0,0.18)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#c9952f] rounded-l-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-[#928b7c] font-semibold text-xs uppercase tracking-widest">Blocos Consumidos</h3>
            <span className="p-2 bg-[#f5f5f0] rounded-lg text-[#928b7c]">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          {loading ? (
            <div className="h-10 w-16 bg-black/5 rounded animate-pulse" />
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-[#171713]">{usageUnavailable ? "-" : blocksUsed}</div>
                {blocksLimitText && (
                  <span className="text-xs text-[#928b7c] font-mono">{blocksLimitText}</span>
                )}
              </div>
              <div className="text-xs text-[#928b7c] mt-1">
                {usageUnavailable ? "Uso indisponivel" : "Uso do mes informado pela conta"}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── RECENT NESTINGS + REMNANTS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Projetos Recentes */}
        <section className="bg-white border border-black/10 rounded-xl p-5 shadow-[0_14px_32px_-24px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#171713] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#c9952f]" />
              Projetos Recentes
            </h2>
            <Link href="/history" className="text-xs font-semibold text-[#c9952f] hover:text-[#8b651f] transition-colors flex items-center gap-1">
              VER TODOS <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#c9952f] mb-2" />
                <span className="text-[#928b7c] text-xs">Carregando...</span>
              </div>
            ) : loadErrors.nestings ? (
              <DataUnavailableState message={loadErrors.nestings} />
            ) : nestings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#fafaf7] rounded-lg border border-dashed border-black/10">
                <span className="text-[#928b7c] text-xs mb-2">Nenhum projeto encontrado.</span>
                <Link href="/nesting" className="text-[#c9952f] hover:text-[#8b651f] text-xs font-bold uppercase transition-colors">
                  CRIAR O PRIMEIRO
                </Link>
              </div>
            ) : (
              nestings.slice(0, 5).map((proj) => {
                const displayId = `NS-${proj.id.substring(0, 4).toUpperCase()}`;
                const efficiency = proj.waste_percent != null
                  ? `${(100 - proj.waste_percent).toFixed(1)}%`
                  : "—";
                const statusColors: Record<string, string> = {
                  completed: "bg-green-100 text-green-700",
                  failed: "bg-red-100 text-red-700",
                  processing: "bg-yellow-100 text-yellow-700",
                  pending: "bg-gray-100 text-gray-600",
                };

                return (
                  <div key={proj.id} className="flex items-center justify-between p-3 bg-[#fafaf7] border border-black/5 rounded-lg hover:border-[#c9952f]/30 transition-colors">
                    <div>
                      <div className="text-xs font-mono text-[#c9952f] mb-0.5">{displayId}</div>
                      <div className="font-semibold text-sm text-[#171713]">{(proj.name || "Projeto sem nome").substring(0, 28)}</div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${statusColors[proj.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {proj.status}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#171713]">{efficiency}</div>
                      <div className="text-[#928b7c] text-xs">{proj.total_blocks != null ? `${proj.total_blocks} bloco${proj.total_blocks !== 1 ? "s" : ""}` : "—"}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Estoque Retalhos */}
        <section className="bg-white border border-black/10 rounded-xl p-5 shadow-[0_14px_32px_-24px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-[#171713] flex items-center gap-2">
              <Package className="w-4 h-4 text-[#c9952f]" />
              Estoque de Retalhos
            </h2>
            <Link href="/remnants" className="text-xs font-semibold text-[#c9952f] hover:text-[#8b651f] transition-colors flex items-center gap-1">
              INVENTÁRIO <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#c9952f] mb-2" />
                <span className="text-[#928b7c] text-xs">Carregando...</span>
              </div>
            ) : loadErrors.remnants ? (
              <DataUnavailableState message={loadErrors.remnants} />
            ) : availableRemnants.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#fafaf7] rounded-lg border border-dashed border-black/10">
                <span className="text-[#928b7c] text-xs mb-2">Nenhum retalho disponível.</span>
                <Link href="/remnants" className="text-[#c9952f] hover:text-[#8b651f] text-xs font-bold uppercase transition-colors">
                  ADICIONAR RETALHO
                </Link>
              </div>
            ) : (
              availableRemnants.slice(0, 5).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 bg-[#fafaf7] border border-black/5 rounded-lg hover:border-[#c9952f]/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-green-400 rounded-full" />
                    <div>
                      <div className="font-mono text-sm font-bold text-[#171713]">{r.width} × {r.height} mm</div>
                      <div className="text-xs text-[#928b7c]">{((r.width * r.height) / 1e6).toFixed(3)} m²</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 uppercase font-bold border border-green-400/40 bg-green-50 text-green-700 rounded">
                    Disponível
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function getUsageValue(account: MeResponse | null, kind: "nestings" | "blocks") {
  if (!account) return null;
  const usage = account.usage ?? {};
  if (kind === "nestings") {
    return usage.nestings_this_month ?? usage.nestings_used ?? null;
  }
  return usage.blocks_this_month ?? usage.blocks_used ?? null;
}

function formatLimit(limit?: number) {
  if (limit === undefined) return "";
  if (limit === -1) return "/ ilimitado";
  return `/ ${limit}`;
}

function formatLoadError(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return `${fallback} ${error.message}`;
  if (error instanceof Error) return `${fallback} ${error.message}`;
  return fallback;
}

function DataUnavailableState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
      <AlertCircle className="mb-2 h-5 w-5 text-amber-700" />
      <span className="text-xs font-semibold text-amber-900">{message}</span>
      <span className="mt-1 text-xs text-amber-800">Confira a API antes de interpretar estes dados.</span>
    </div>
  );
}
