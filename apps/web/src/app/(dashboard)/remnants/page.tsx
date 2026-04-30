"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
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

  async function loadRemnants() {
    setFetching(true);
    setError(null);
    try {
      const data = await api.listRemnants(filter === "all" ? undefined : filter);
      setRemnants(data);
    } catch (e) {
      setError(
        e instanceof ApiClientError
          ? `Erro ao carregar retalhos (${e.status}): ${e.message}`
          : "Erro ao carregar retalhos"
      );
    } finally {
      setFetching(false);
    }
  }

  useEffect(() => {
    loadRemnants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

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

  const totalArea =
    remnants
      .filter((r) => r.status === "disponivel")
      .reduce((sum, r) => sum + r.width * r.height, 0) / 1e6; // m²

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Retalhos</h1>
          <p className="text-white/50 text-sm mt-1">
            Gerencie o estoque de retalhos de EPS
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-yellow-400 text-black font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-yellow-300 transition-colors"
        >
          + Adicionar Retalho
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#161616] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Disponíveis
          </p>
          <p className="text-2xl font-bold text-green-400 mt-1">
            {remnants.filter((r) => r.status === "disponivel").length}
          </p>
        </div>
        <div className="bg-[#161616] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Descartados
          </p>
          <p className="text-2xl font-bold text-white/40 mt-1">
            {remnants.filter((r) => r.status === "descartado").length}
          </p>
        </div>
        <div className="bg-[#161616] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wider">
            Área Disponível
          </p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">
            {totalArea.toFixed(2)} m²
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        {(["all", "disponivel", "descartado"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              filter === f
                ? "bg-yellow-400/10 border-yellow-400/40 text-yellow-400"
                : "border-white/10 text-white/50 hover:border-white/30"
            }`}
          >
            {f === "all" ? "Todos" : f === "disponivel" ? "Disponíveis" : "Descartados"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-[#161616] border border-white/10 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4">Novo Retalho</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-white/50 block mb-1">Largura (mm)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="ex: 1500"
                className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Altura (mm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="ex: 600"
                className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/50"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">Profundidade (mm)</label>
              <input
                type="number"
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                className="w-full bg-[#0f0f0f] border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/50"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={addRemnant}
              disabled={loading || !width || !height}
              className="bg-yellow-400 text-black font-semibold text-sm px-4 py-2 rounded-lg hover:bg-yellow-300 disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="border border-white/20 text-white text-sm px-4 py-2 rounded-lg hover:border-white/40"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-[#161616] border border-white/10 rounded-xl overflow-hidden">
        {fetching ? (
          <div className="py-16 text-center">
            <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-white/40 text-sm mt-3">Carregando...</p>
          </div>
        ) : remnants.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <p className="text-white/50 text-sm">
              {filter === "all"
                ? "Nenhum retalho cadastrado"
                : `Nenhum retalho ${filter === "disponivel" ? "disponível" : "descartado"}`}
            </p>
            <p className="text-white/30 text-xs mt-1">
              Adicione retalhos de cortes anteriores para reutilizá-los
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs">
                <th className="text-left px-6 py-3 font-medium">ID</th>
                <th className="text-left px-4 py-3 font-medium">Largura</th>
                <th className="text-left px-4 py-3 font-medium">Altura</th>
                <th className="text-left px-4 py-3 font-medium">Profundidade</th>
                <th className="text-left px-4 py-3 font-medium">Área</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Criado</th>
                <th className="text-right px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {remnants.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-3 text-white/40 font-mono text-xs">
                    {r.id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">{r.width} mm</td>
                  <td className="px-4 py-3">{r.height} mm</td>
                  <td className="px-4 py-3">{r.depth} mm</td>
                  <td className="px-4 py-3 text-white/60">
                    {((r.width * r.height) / 1e6).toFixed(3)} m²
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStatus(r)}
                      className={`text-xs px-2 py-0.5 rounded-full transition-opacity hover:opacity-70 ${
                        r.status === "disponivel"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {r.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteRemnant(r.id)}
                      className="text-white/30 hover:text-red-400 text-xs transition-colors"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
