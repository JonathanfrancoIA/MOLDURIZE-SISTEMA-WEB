"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { AlertCircle, Loader2, PackageOpen, Plus, Trash2 } from "lucide-react";
import { ApiClientError, createBrowserApiClient, type Remnant, type RemnantStatus } from "@/lib/api";

export default function RemnantsPage() {
  if (hasClerkKey) {
    return <RemnantsPageWithClerk />;
  }

  return <RemnantsContent />;
}

const hasClerkKey =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("SUBSTITUA");

const statusLabel: Record<RemnantStatus, string> = {
  disponivel: "Disponivel",
  descartado: "Descartado",
};

const statusClass: Record<RemnantStatus, string> = {
  disponivel: "border-green-200 bg-green-50 text-green-700",
  descartado: "border-red-200 bg-red-50 text-red-700",
};

function RemnantsPageWithClerk() {
  const { getToken } = useAuth();
  const getAuthToken = useCallback(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken]);

  return <RemnantsContent getAuthToken={getAuthToken} />;
}

function RemnantsContent({
  getAuthToken,
}: {
  getAuthToken?: () => string | null | Promise<string | null>;
}) {
  const api = useMemo(() => createBrowserApiClient(getAuthToken), [getAuthToken]);
  const [remnants, setRemnants] = useState<Remnant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("100");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RemnantStatus | "all">("all");

  useEffect(() => {
    let active = true;

    async function loadRemnants() {
      setFetching(true);
      setError(null);
      try {
        const data = await api.listRemnants();
        if (active) {
          setRemnants(data);
        }
      } catch (e) {
        if (active) {
          setError(
            e instanceof ApiClientError
              ? `Erro ao carregar retalhos (${e.status}): ${e.message}`
              : "Erro ao carregar retalhos"
          );
        }
      } finally {
        if (active) {
          setFetching(false);
        }
      }
    }

    loadRemnants();

    return () => {
      active = false;
    };
  }, [api]);

  async function addRemnant() {
    if (!width || !height) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.createRemnant({
        width: parseFloat(width),
        height: parseFloat(height),
        depth: parseFloat(depth) || 100,
      });
      setRemnants((prev) => [r, ...prev]);
      setWidth("");
      setHeight("");
      setDepth("100");
      setShowForm(false);
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? `Erro ao adicionar: ${e.message}`
          : "Erro ao adicionar retalho"
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(r: Remnant) {
    const next: RemnantStatus =
      r.status === "disponivel" ? "descartado" : "disponivel";
    try {
      const updated = await api.updateRemnant(r.id, { status: next });
      setRemnants((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao atualizar");
    }
  }

  async function deleteRemnant(id: string) {
    if (!confirm("Remover este retalho permanentemente?")) return;
    try {
      await api.deleteRemnant(id);
      setRemnants((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover");
    }
  }

  const availableRemnants = remnants.filter((r) => r.status === "disponivel");
  const discardedCount = remnants.filter((r) => r.status === "descartado").length;
  const visibleRemnants =
    filter === "all" ? remnants : remnants.filter((r) => r.status === filter);
  const totalArea =
    availableRemnants.reduce((sum, r) => sum + r.width * r.height, 0) / 1e6;
  const emptyLabel =
    filter === "all"
      ? "Nenhum retalho cadastrado"
      : `Nenhum retalho ${filter === "disponivel" ? "disponivel" : "descartado"}`;

  return (
    <div className="min-h-full bg-[#f5f5f0] p-4 text-[#171713] sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171713]">Retalhos</h1>
          <p className="mt-1 text-sm text-[#625f55]">
            Controle o estoque reutilizavel de EPS para proximos jobs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171713] px-4 text-sm font-semibold text-[#f2c767] shadow-[0_12px_28px_-18px_rgba(0,0,0,0.55)] transition-all duration-200 hover:bg-[#2a281f] active:-translate-y-[1px]"
        >
          <Plus className="h-4 w-4" strokeWidth={1.8} />
          Adicionar retalho
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Disponiveis" value={availableRemnants.length.toString()} tone="green" />
        <MetricCard label="Descartados" value={discardedCount.toString()} />
        <MetricCard label="Area disponivel" value={`${totalArea.toFixed(2)} m2`} tone="accent" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["all", "disponivel", "descartado"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`h-8 rounded-md border px-3 text-xs font-semibold transition-all duration-200 active:scale-[0.98] ${
              filter === f
                ? "border-[#c9952f]/45 bg-[#fff5da] text-[#8b651f]"
                : "border-black/10 bg-white/80 text-[#625f55] hover:border-[#c9952f]/40 hover:text-[#171713]"
            }`}
          >
            {f === "all" ? "Todos" : statusLabel[f]}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl border border-black/10 bg-white p-5 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
          <h2 className="mb-4 text-sm font-bold text-[#171713]">Novo retalho</h2>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <TextInput
              label="Largura"
              suffix="mm"
              value={width}
              onChange={setWidth}
              placeholder="ex: 1500"
            />
            <TextInput
              label="Altura"
              suffix="mm"
              value={height}
              onChange={setHeight}
              placeholder="ex: 600"
            />
            <TextInput
              label="Profundidade"
              suffix="mm"
              value={depth}
              onChange={setDepth}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={addRemnant}
              disabled={loading || !width || !height}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#171713] px-4 text-sm font-semibold text-[#f2c767] transition-all duration-200 hover:bg-[#2a281f] disabled:cursor-not-allowed disabled:opacity-50 active:-translate-y-[1px]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-10 rounded-lg border border-black/10 bg-white px-4 text-sm font-semibold text-[#625f55] transition-colors hover:border-black/20 hover:text-[#171713]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        {fetching ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <Loader2 className="mb-3 h-6 w-6 animate-spin text-[#c9952f]" />
            <p className="text-sm font-semibold text-[#625f55]">Carregando retalhos...</p>
          </div>
        ) : visibleRemnants.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-black/10 bg-[#f5f5f0] text-[#928b7c]">
              <PackageOpen className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <p className="text-sm font-semibold text-[#171713]">{emptyLabel}</p>
            <p className="mt-1 text-xs text-[#625f55]">
              Cadastre sobras de cortes anteriores para reutilizar no planejamento.
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-black/5 md:hidden">
              {visibleRemnants.map((r) => (
                <article key={r.id} className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-[#8b651f]">
                        {r.id.slice(0, 8)}...
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#171713]">
                        {r.width} x {r.height} mm
                      </p>
                      <p className="text-xs text-[#625f55]">
                        Prof. {r.depth} mm | {((r.width * r.height) / 1e6).toFixed(3)} m2
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteRemnant(r.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-black/10 text-[#928b7c] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleStatus(r)}
                      className={`inline-flex rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase transition-opacity hover:opacity-75 ${statusClass[r.status]}`}
                    >
                      {statusLabel[r.status]}
                    </button>
                    <span className="text-xs text-[#928b7c]">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-[#fafaf7]">
                  <tr className="border-b border-black/10 text-xs text-[#625f55]">
                    <th className="px-6 py-3 text-left font-semibold">ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Largura</th>
                    <th className="px-4 py-3 text-left font-semibold">Altura</th>
                    <th className="px-4 py-3 text-left font-semibold">Profundidade</th>
                    <th className="px-4 py-3 text-left font-semibold">Area</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Criado em</th>
                    <th className="px-4 py-3 text-right font-semibold" aria-label="Acoes" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRemnants.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-black/5 last:border-b-0 hover:bg-[#fafaf7]"
                    >
                      <td className="px-6 py-3 font-mono text-xs text-[#928b7c]">
                        {r.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#171713]">{r.width} mm</td>
                      <td className="px-4 py-3 text-[#625f55]">{r.height} mm</td>
                      <td className="px-4 py-3 text-[#625f55]">{r.depth} mm</td>
                      <td className="px-4 py-3 font-mono text-xs text-[#625f55]">
                        {((r.width * r.height) / 1e6).toFixed(3)} m2
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleStatus(r)}
                          className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase transition-opacity hover:opacity-75 ${statusClass[r.status]}`}
                        >
                          {statusLabel[r.status]}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#625f55]">
                        {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteRemnant(r.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black/10 text-[#928b7c] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "green";
}) {
  const valueClass =
    tone === "accent"
      ? "text-[#8b651f]"
      : tone === "green"
        ? "text-green-700"
        : "text-[#171713]";

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_32px_-24px_rgba(0,0,0,0.18)]">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#928b7c]">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function TextInput({
  label,
  suffix,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#625f55]">{label}</span>
      <div className="flex h-10 items-center rounded-md border border-black/10 bg-white transition-colors focus-within:border-[#c9952f]/70">
        <input
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#171713] outline-none placeholder:text-[#aaa493]"
        />
        <span className="shrink-0 pr-3 text-[10px] font-semibold text-[#928b7c]">{suffix}</span>
      </div>
    </label>
  );
}
