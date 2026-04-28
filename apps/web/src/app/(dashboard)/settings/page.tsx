"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type PlansResponse, type PlanTier } from "@/lib/api";

const PLAN_LABELS: Record<PlanTier, { label: string; color: string }> = {
  free: { label: "Free", color: "text-white/60" },
  starter: { label: "Starter", color: "text-blue-400" },
  pro: { label: "Pro", color: "text-yellow-400" },
  enterprise: { label: "Enterprise", color: "text-purple-400" },
};

export default function SettingsPage() {
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [currentPlan] = useState<PlanTier>("free"); // TODO: wire to Clerk + backend
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(() => setPlans(null));
  }, []);

  async function openBillingPortal() {
    setLoadingPortal(true);
    setMessage(null);
    try {
      // In production, customer_id would come from backend user context
      const res = await api.createPortal({
        customer_id: "cus_demo",
        return_url: window.location.href,
      });
      window.location.href = res.portal_url;
    } catch (e) {
      setMessage({
        kind: "err",
        text:
          e instanceof Error
            ? e.message
            : "Erro ao abrir portal. Configure o Stripe primeiro.",
      });
    } finally {
      setLoadingPortal(false);
    }
  }

  const planInfo = PLAN_LABELS[currentPlan];
  const planDetails = plans?.plans.find((p) => p.id === currentPlan);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-white/50 text-sm mt-1">
          Gerencie sua conta, plano e preferências
        </p>
      </header>

      {message && (
        <div
          className={`mb-6 border rounded-lg p-3 text-sm ${
            message.kind === "ok"
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Conta */}
      <section className="bg-[#161616] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
          Conta
        </h2>
        <p className="text-white/50 text-sm mb-3">
          Use o menu de usuário no canto inferior esquerdo para editar email,
          senha, foto e sessões ativas.
        </p>
        <p className="text-white/30 text-xs">
          Autenticação gerenciada via Clerk.
        </p>
      </section>

      {/* Plano atual */}
      <section className="bg-[#161616] border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
              Seu Plano
            </h2>
            <div className="flex items-baseline gap-3 mt-2">
              <span className={`text-2xl font-bold ${planInfo.color}`}>
                {planInfo.label}
              </span>
              {planDetails && (
                <span className="text-sm text-white/50">
                  R$ {planDetails.price}/{planDetails.period}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/pricing"
            className="text-xs bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
          >
            {currentPlan === "free" ? "Fazer Upgrade" : "Mudar Plano"}
          </Link>
        </div>

        {planDetails && (
          <div className="border-t border-white/10 pt-4">
            <p className="text-xs text-white/40 mb-2">Incluído neste plano:</p>
            <ul className="space-y-1.5">
              {planDetails.features.map((f) => (
                <li key={f} className="text-sm text-white/70 flex items-center gap-2">
                  <span className="text-yellow-400">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {currentPlan !== "free" && (
          <button
            onClick={openBillingPortal}
            disabled={loadingPortal}
            className="mt-4 w-full text-sm border border-white/20 text-white py-2.5 rounded-lg hover:border-white/40 transition-colors disabled:opacity-50"
          >
            {loadingPortal ? "Abrindo..." : "Gerenciar Faturamento (Portal Stripe)"}
          </button>
        )}
      </section>

      {/* Uso */}
      <section className="bg-[#161616] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
          Uso neste mês
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <UsageStat label="Nestings realizados" value="0" limit={planDetails?.nestings_limit} />
          <UsageStat label="Blocos usados" value="0" limit={planDetails?.blocks_limit} />
          <UsageStat label="Retalhos ativos" value="0" />
        </div>
      </section>

      {/* API */}
      <section className="bg-[#161616] border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-4">
          API & Integrações
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 block mb-1">Backend URL</label>
            <code className="block text-xs bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white/80 font-mono">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}
            </code>
          </div>
          <Link
            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/docs`}
            target="_blank"
            className="inline-block text-xs text-yellow-400 hover:underline"
          >
            Ver documentação OpenAPI →
          </Link>
          {currentPlan === "enterprise" && (
            <div className="border-t border-white/10 pt-3 mt-3">
              <p className="text-xs text-white/50 mb-2">API Key pessoal (Enterprise)</p>
              <code className="block text-xs bg-[#0f0f0f] border border-white/10 rounded-lg px-3 py-2 text-white/80 font-mono">
                mk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
              </code>
            </div>
          )}
        </div>
      </section>

      {/* Zona de perigo */}
      <section className="border border-red-500/20 bg-red-500/5 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">
          Zona de Perigo
        </h2>
        <p className="text-white/50 text-sm mb-4">
          Exclusão da conta é permanente e remove todos os nestings e retalhos.
        </p>
        <button
          onClick={() => alert("Use o menu de usuário do Clerk para deletar sua conta.")}
          className="text-sm border border-red-500/30 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          Deletar Conta
        </button>
      </section>
    </div>
  );
}

function UsageStat({
  label,
  value,
  limit,
}: {
  label: string;
  value: string;
  limit?: number;
}) {
  const limitText =
    limit === undefined ? "" : limit === -1 ? "/ ilimitado" : `/ ${limit}`;
  return (
    <div className="bg-[#0f0f0f] border border-white/10 rounded-lg p-3">
      <p className="text-xs text-white/40">{label}</p>
      <p className="text-lg font-bold text-white mt-1">
        {value}
        <span className="text-xs text-white/30 font-normal ml-1">{limitText}</span>
      </p>
    </div>
  );
}
