"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type PlansResponse, type PlanTier } from "@/lib/api";

const PLAN_LABELS: Record<PlanTier, { label: string; color: string }> = {
  free: { label: "Free", color: "text-[#928b7c]" },
  starter: { label: "Starter", color: "text-blue-600" },
  pro: { label: "Pro", color: "text-[#c9952f]" },
  enterprise: { label: "Enterprise", color: "text-[#171713]" },
};

const hasClerkKey =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("SUBSTITUA");

export default function SettingsPage() {
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  // Plan comes from Clerk publicMetadata when available, otherwise defaults to "free"
  const [currentPlan, setCurrentPlan] = useState<PlanTier>("free");
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    api.getPlans().then(setPlans).catch(() => setPlans(null));
  }, []);

  // Attempt to read plan from Clerk user metadata (only when Clerk is configured)
  useEffect(() => {
    if (!hasClerkKey) return;
    import("@clerk/nextjs").then((clerk) => {
      const { useUser } = clerk;
      // Note: hooks can't be called inside dynamic imports.
      // Clerk plan is set via webhook → backend → Clerk publicMetadata
      // For now we keep "free" as the safe default.
      // TODO: expose /api/v1/me endpoint to get plan from backend
    }).catch(() => {});
  }, []);

  async function openBillingPortal() {
    setLoadingPortal(true);
    setMessage(null);
    try {
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
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#171713]">Configurações</h1>
        <p className="text-[#625f55] text-sm mt-1">
          Gerencie sua conta, plano e preferências
        </p>
      </header>

      {message && (
        <div
          className={`mb-6 border rounded-xl p-3 text-sm ${
            message.kind === "ok"
              ? "border-green-300 bg-green-50 text-green-700"
              : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Conta */}
      <section className="bg-white border border-black/8 rounded-xl p-6 mb-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        <h2 className="text-xs font-semibold text-[#928b7c] uppercase tracking-wider mb-3">
          Conta
        </h2>
        <p className="text-[#625f55] text-sm mb-2">
          Use o menu de usuário no cabeçalho para editar email, senha, foto e sessões ativas.
        </p>
        <p className="text-[#928b7c] text-xs">
          Autenticação gerenciada via Clerk.
        </p>
      </section>

      {/* Plano atual */}
      <section className="bg-white border border-black/8 rounded-xl p-6 mb-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold text-[#928b7c] uppercase tracking-wider">
              Seu Plano
            </h2>
            <div className="flex items-baseline gap-3 mt-2">
              <span className={`text-2xl font-bold ${planInfo.color}`}>
                {planInfo.label}
              </span>
              {planDetails && (
                <span className="text-sm text-[#928b7c]">
                  R$ {planDetails.price}/{planDetails.period}
                </span>
              )}
            </div>
          </div>
          <Link
            href="/pricing"
            className="text-xs bg-[#171713] text-[#f2c767] font-semibold px-4 py-2 rounded-lg hover:bg-[#2a281f] transition-colors"
          >
            {currentPlan === "free" ? "Fazer Upgrade" : "Mudar Plano"}
          </Link>
        </div>

        {planDetails && (
          <div className="border-t border-black/8 pt-4">
            <p className="text-xs text-[#928b7c] mb-2">Incluído neste plano:</p>
            <ul className="space-y-1.5">
              {planDetails.features.map((f) => (
                <li key={f} className="text-sm text-[#625f55] flex items-center gap-2">
                  <span className="text-[#c9952f]">✓</span>
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
            className="mt-4 w-full text-sm border border-black/10 text-[#625f55] py-2.5 rounded-xl hover:border-black/20 hover:text-[#171713] transition-colors disabled:opacity-50"
          >
            {loadingPortal ? "Abrindo..." : "Gerenciar Faturamento (Portal Stripe)"}
          </button>
        )}
      </section>

      {/* Uso */}
      <section className="bg-white border border-black/8 rounded-xl p-6 mb-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        <h2 className="text-xs font-semibold text-[#928b7c] uppercase tracking-wider mb-4">
          Uso neste mês
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <UsageStat label="Nestings realizados" value="—" limit={planDetails?.nestings_limit} />
          <UsageStat label="Blocos usados" value="—" limit={planDetails?.blocks_limit} />
          <UsageStat label="Retalhos ativos" value="—" />
        </div>
        <p className="text-[10px] text-[#928b7c] mt-3">
          * Conecte o banco de dados para ver uso real
        </p>
      </section>

      {/* API */}
      <section className="bg-white border border-black/8 rounded-xl p-6 mb-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        <h2 className="text-xs font-semibold text-[#928b7c] uppercase tracking-wider mb-4">
          API & Integrações
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#928b7c] block mb-1">Backend URL</label>
            <code className="block text-xs bg-[#f5f5f0] border border-black/8 rounded-lg px-3 py-2 text-[#625f55] font-mono">
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}
            </code>
          </div>
          <Link
            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001"}/docs`}
            target="_blank"
            className="inline-block text-xs text-[#c9952f] hover:underline"
          >
            Ver documentação OpenAPI →
          </Link>
        </div>
      </section>

      {/* Zona de perigo */}
      <section className="border border-red-200 bg-red-50 rounded-xl p-6">
        <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
          Zona de Perigo
        </h2>
        <p className="text-[#625f55] text-sm mb-4">
          Exclusão da conta é permanente e remove todos os nestings e retalhos.
        </p>
        <button
          onClick={() => alert("Use o menu de usuário do Clerk para deletar sua conta.")}
          className="text-sm border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
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
    limit === undefined ? "" : limit === -1 ? "/ ∞" : `/ ${limit}`;
  return (
    <div className="bg-[#f5f5f0] border border-black/6 rounded-lg p-3">
      <p className="text-xs text-[#928b7c]">{label}</p>
      <p className="text-lg font-bold text-[#171713] mt-1">
        {value}
        <span className="text-xs text-[#928b7c] font-normal ml-1">{limitText}</span>
      </p>
    </div>
  );
}
