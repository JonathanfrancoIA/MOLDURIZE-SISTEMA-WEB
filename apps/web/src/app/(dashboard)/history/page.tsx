"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, NestingSummary } from "@/lib/api";

const statusLabel: Record<NestingSummary["status"], string> = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Concluído",
  failed: "Falhou",
};

const statusColor: Record<NestingSummary["status"], string> = {
  pending: "text-yellow-400",
  processing: "text-yellow-400",
  completed: "text-green-400",
  failed: "text-red-400",
};

export default function HistoryPage() {
  const [nestings, setNestings] = useState<NestingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listNestings()
      .then(setNestings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171713]">Histórico</h1>
          <p className="text-[#625f55] text-sm mt-1">Todos os nestings realizados</p>
        </div>
        <Link
          href="/nesting"
          className="inline-flex items-center gap-2 bg-[#171713] text-[#f2c767] font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-[#2a281f] transition-colors"
        >
          + Novo Nesting
        </Link>
      </div>

      <div className="bg-white border border-black/8 rounded-xl overflow-hidden shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-white/30 text-xs mt-1">Verifique se a API está rodando e acessível na porta 8001</p>
          </div>
        ) : nestings.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-white/50 text-sm">Nenhum nesting salvo ainda</p>
            <p className="text-white/30 text-xs mt-1">
              Os nestings realizados aparecerão aqui quando o banco estiver configurado
            </p>
            <Link
              href="/nesting"
              className="inline-block mt-4 text-sm text-yellow-400 hover:text-yellow-300"
            >
              Criar nesting →
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs">
                <th className="text-left px-6 py-3 font-medium">Nome / ID</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Qtd. Blocos</th>
                <th className="text-left px-4 py-3 font-medium">Eficiência</th>
                <th className="text-left px-4 py-3 font-medium">Criado em</th>
                <th className="text-left px-4 py-3 font-medium">Concluído em</th>
                <th className="text-left px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {nestings.map((n) => (
                <tr key={n.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-6 py-3">
                    <div className="font-medium text-white">{n.name || "Sem nome"}</div>
                    <div className="text-white/30 text-xs font-mono">{n.id.slice(0, 8)}...</div>
                  </td>
                  <td className={`px-4 py-3 font-medium ${statusColor[n.status]}`}>
                    {statusLabel[n.status]}
                  </td>
                  <td className="px-4 py-3 text-white/70">{n.total_blocks ?? "—"}</td>
                  <td className="px-4 py-3">
                    {n.waste_percent != null ? (
                      <span className="text-yellow-400 font-medium">
                        {(100 - n.waste_percent).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {new Date(n.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-white/40 text-xs">
                    {n.completed_at ? new Date(n.completed_at).toLocaleDateString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/nesting?id=${n.id}`}
                      className="text-xs text-white/40 hover:text-yellow-400 transition-colors"
                    >
                      Ver →
                    </Link>
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
