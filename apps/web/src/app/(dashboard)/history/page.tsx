"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { FileText } from "lucide-react";
import { createBrowserApiClient, type NestingSummary } from "@/lib/api";

const statusLabel: Record<NestingSummary["status"], string> = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Concluido",
  failed: "Falhou",
};

const statusClass: Record<NestingSummary["status"], string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  processing: "border-blue-200 bg-blue-50 text-blue-700",
  completed: "border-green-200 bg-green-50 text-green-700",
  failed: "border-red-200 bg-red-50 text-red-700",
};

export default function HistoryPage() {
  if (hasClerkKey) {
    return <HistoryPageWithClerk />;
  }

  return <HistoryContent />;
}

const hasClerkKey =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("SUBSTITUA");

function HistoryPageWithClerk() {
  const { getToken } = useAuth();
  const getAuthToken = useCallback(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken]);

  return <HistoryContent getAuthToken={getAuthToken} />;
}

function HistoryContent({
  getAuthToken,
}: {
  getAuthToken?: () => string | null | Promise<string | null>;
}) {
  const api = useMemo(() => createBrowserApiClient(getAuthToken), [getAuthToken]);
  const [nestings, setNestings] = useState<NestingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.listNestings()
      .then(setNestings)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Erro ao carregar historico"))
      .finally(() => setLoading(false));
  }, [api]);

  return (
    <div className="min-h-full bg-[#f5f5f0] p-6 text-[#171713]">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#171713]">Historico</h1>
          <p className="text-[#625f55] text-sm mt-1">Todos os nestings realizados</p>
        </div>
        <Link
          href="/nesting"
          className="inline-flex items-center gap-2 bg-[#171713] text-[#f2c767] font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-[#2a281f] transition-colors"
        >
          + Novo Nesting
        </Link>
      </div>

      <div className="bg-white border border-black/10 rounded-xl overflow-hidden shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[#c9952f] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="py-12 px-6 text-center">
            <p className="text-red-700 text-sm font-semibold">{error}</p>
            <p className="text-[#625f55] text-xs mt-1">
              Verifique se a API esta rodando e acessivel na porta 8001.
            </p>
          </div>
        ) : nestings.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-black/10 bg-[#f5f5f0] text-[#928b7c]">
              <FileText className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <p className="text-[#171713] text-sm font-semibold">Nenhum nesting salvo ainda</p>
            <p className="text-[#625f55] text-xs mt-1">
              Os nestings realizados aparecerao aqui quando o banco estiver configurado.
            </p>
            <Link
              href="/nesting"
              className="inline-block mt-4 text-sm font-semibold text-[#8b651f] hover:text-[#5f4414]"
            >
              Criar nesting
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-[#fafaf7]">
                <tr className="border-b border-black/10 text-[#625f55] text-xs">
                  <th className="text-left px-6 py-3 font-semibold">Nome / ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Qtd. Blocos</th>
                  <th className="text-left px-4 py-3 font-semibold">Eficiencia</th>
                  <th className="text-left px-4 py-3 font-semibold">Criado em</th>
                  <th className="text-left px-4 py-3 font-semibold">Concluido em</th>
                  <th className="text-left px-4 py-3 font-semibold" aria-label="Acoes" />
                </tr>
              </thead>
              <tbody>
                {nestings.map((nesting) => (
                  <tr key={nesting.id} className="border-b border-black/5 last:border-b-0 hover:bg-[#fafaf7]">
                    <td className="px-6 py-3">
                      <div className="font-semibold text-[#171713]">{nesting.name || "Sem nome"}</div>
                      <div className="text-[#928b7c] text-xs font-mono">{nesting.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-bold uppercase ${statusClass[nesting.status]}`}>
                        {statusLabel[nesting.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#625f55]">{nesting.total_blocks ?? "Nao informado"}</td>
                    <td className="px-4 py-3">
                      {nesting.waste_percent != null ? (
                        <span className="text-[#8b651f] font-semibold">
                          {(100 - nesting.waste_percent).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-[#928b7c]">Nao informado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#625f55] text-xs">
                      {new Date(nesting.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-[#625f55] text-xs">
                      {nesting.completed_at
                        ? new Date(nesting.completed_at).toLocaleDateString("pt-BR")
                        : "Nao informado"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/nesting?id=${nesting.id}`}
                        className="text-xs font-semibold text-[#8b651f] hover:text-[#5f4414] transition-colors"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
