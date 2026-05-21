"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { PieChart, TrendingUp, Scissors, Package, LayoutGrid, Clock, ArrowRight, Loader2, AlertCircle, Info } from "lucide-react";
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

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours} h`;
    if (diffDays < 30) return `há ${diffDays} d`;
    return dateString.split("T")[0];
  } catch {
    return "—";
  }
}

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

  const mostRecentNestingTime = useMemo(() => {
    if (!nestings.length) return null;
    // Assume API returns nestings sorted by created_at DESC; if not, sort client-side
    const newest = nestings[0];
    return newest.created_at ? formatRelativeTime(newest.created_at) : null;
  }, [nestings]);

  return (
    <div className="min-h-full bg-gradient-to-b from-gray-950 to-gray-900 text-white p-6 overflow-y-auto">

      {/* ─── HEADER ─── */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Visão Geral</h1>
          <p className="text-gray-400 text-sm">Acompanhe a eficiência e o desempenho da sua fábrica de EPS em tempo real.</p>
        </div>
        <Link
          href="/nesting"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm px-6 py-3 rounded-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all active:scale-95 shrink-0"
        >
          <Scissors className="w-4 h-4" />
          Novo Projeto de Corte
        </Link>
      </header>

      {/* API offline warning */}
      {apiOffline && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>API offline ou parcialmente indisponível. Dados incompletos não serão tratados como lista vazia. Inicie o backend com <code className="font-mono bg-amber-500/20 px-1 rounded">make dev-api</code>.</span>
        </div>
      )}

      {/* ─── METRICS GRID ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

        {/* Métrica 1 — Jobs processados */}
        <div className="relative overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-6 backdrop-blur transition-all hover:border-cyan-500/40 group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Uso de Nestings</p>
              </div>
              <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                <LayoutGrid className="w-4 h-4" />
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="h-8 w-20 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-3 w-32 bg-gray-700/30 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-4xl font-bold text-cyan-300">{nestingsUsed}</div>
                  <span className="text-xs text-gray-500 font-mono">
                    {nestingsLimitText || ""}
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {loadErrors.nestings
                    ? "Histórico indisponível"
                    : mostRecentNestingTime
                      ? `Último: ${mostRecentNestingTime}`
                      : `${completedNestings.length} concluídos`}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Métrica 2 — Eficiência média */}
        <div className="relative overflow-hidden rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 p-6 backdrop-blur transition-all hover:border-green-500/40 group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Eficiência Média</p>
              </div>
              <div className="p-2.5 rounded-lg bg-green-500/20 text-green-300 border border-green-500/40">
                <PieChart className="w-4 h-4" />
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="h-8 w-24 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-3 w-40 bg-gray-700/30 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="text-4xl font-bold text-green-300 mb-2">
                  {avgEfficiency ? `${avgEfficiency}%` : "—"}
                </div>
                <div className="text-xs text-gray-400">
                  {loadErrors.nestings
                    ? "Sem dados"
                    : avgEfficiency
                      ? `${parseFloat(avgEfficiency) >= 90 ? "Acima da meta (90%)" : "Meta: 90%"}`
                      : "Calcule seu primeiro nesting"}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Métrica 3 — Blocos totais */}
        <div className="relative overflow-hidden rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6 backdrop-blur transition-all hover:border-blue-500/40 group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Blocos Consumidos</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/40">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="h-8 w-16 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-3 w-36 bg-gray-700/30 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-4xl font-bold text-blue-300">{usageUnavailable ? "-" : blocksUsed}</div>
                  {blocksLimitText && (
                    <span className="text-xs text-gray-500 font-mono">{blocksLimitText}</span>
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  {usageUnavailable ? "Uso indisponível" : "Uso do período"}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Métrica 4 — Economia Estimada */}
        <div className="relative overflow-hidden rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 backdrop-blur transition-all hover:border-amber-500/40 group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Material Economizado</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-help" title="Baseado na eficiência e tamanho dos blocos">
                <Info className="w-4 h-4" />
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">
                <div className="h-8 w-24 bg-gray-700/50 rounded animate-pulse" />
                <div className="h-3 w-28 bg-gray-700/30 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-2">
                  <div className="text-4xl font-bold text-amber-300">{avgEfficiency && totalBlocks ? "~30%" : "—"}</div>
                </div>
                <div className="text-xs text-gray-400">
                  Redução de desperdício
                </div>
              </>
            )}
          </div>
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
