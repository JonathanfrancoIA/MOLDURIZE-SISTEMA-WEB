"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import {
  createBrowserApiClient,
  getApiBaseUrl,
  type MeResponse,
  type PlansResponse,
  type PlanTier,
} from "@/lib/api";

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
  if (hasClerkKey) {
    return <SettingsPageWithClerk />;
  }

  return <SettingsContent showDevAuthNotice />;
}

function SettingsPageWithClerk() {
  const { getToken } = useAuth();
  const getAuthToken = useCallback(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken]);

  return <SettingsContent getAuthToken={getAuthToken} />;
}

function SettingsContent({
  getAuthToken,
  showDevAuthNotice = false,
}: {
  getAuthToken?: () => string | null | Promise<string | null>;
  showDevAuthNotice?: boolean;
}) {
  const api = useMemo(() => createBrowserApiClient(getAuthToken), [getAuthToken]);
  const [plans, setPlans] = useState<PlansResponse | null>(null);
  const [account, setAccount] = useState<MeResponse | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function fetchAccountData() {
      setLoadingAccount(true);
      setAccountError(null);

      const [plansResult, accountResult] = await Promise.allSettled([
        api.getPlans(),
        api.getMe(),
      ]);

      if (!active) return;

      if (plansResult.status === "fulfilled") {
        setPlans(plansResult.value);
      } else {
        setPlans(null);
      }

      if (accountResult.status === "fulfilled") {
        setAccount(accountResult.value);
      } else {
        setAccount(null);
        setAccountError(formatError(accountResult.reason));
      }

      setLoadingAccount(false);
    }

    fetchAccountData();

    return () => {
      active = false;
    };
  }, [api]);

  const currentPlan = normalizePlan(account?.plan);
  const planInfo = currentPlan ? PLAN_LABELS[currentPlan] : null;
  const planDetails = currentPlan ? plans?.plans.find((p) => p.id === currentPlan) : null;
  const customerId = getCustomerId(account);
  const portalAvailable = getPortalAvailable(account);
  const canOpenPortal = Boolean(customerId && portalAvailable);

  async function openBillingPortal() {
    if (!customerId || !portalAvailable) {
      setMessage({
        kind: "err",
        text: "Portal de faturamento indisponivel para esta conta.",
      });
      return;
    }

    setLoadingPortal(true);
    setMessage(null);
    try {
      const res = await api.createPortal({
        customer_id: customerId,
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-[#171713]">Configuracoes</h1>
        <p className="text-[#625f55] text-sm mt-1">
          Gerencie sua conta, plano e preferencias
        </p>
      </header>

      {showDevAuthNotice && (
        <div className="mb-6 border border-amber-300 bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">
          Clerk nao esta configurado. A conta sera buscada sem token para o modo dev.
        </div>
      )}

      {accountError && (
        <div className="mb-6 border border-amber-300 bg-amber-50 text-amber-800 rounded-xl p-3 text-sm">
          Nao foi possivel carregar os dados da conta: {accountError}
        </div>
      )}

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

      <section className="bg-white border border-black/8 rounded-xl p-6 mb-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        <h2 className="text-xs font-semibold text-[#928b7c] uppercase tracking-wider mb-4">
          Conta
        </h2>
        {loadingAccount ? (
          <div className="grid gap-3 md:grid-cols-3">
            <SkeletonLine />
            <SkeletonLine />
            <SkeletonLine />
          </div>
        ) : account ? (
          <div className="grid gap-3 md:grid-cols-3">
            <AccountField label="Nome" value={account.name || "Nao informado"} />
            <AccountField label="Email" value={account.email || "Nao informado"} />
            <AccountField label="Clerk ID" value={account.clerk_id || "Nao informado"} mono />
          </div>
        ) : (
          <p className="text-[#625f55] text-sm">
            Dados da conta indisponiveis. Verifique a sessao e a API.
          </p>
        )}
      </section>

      <section className="bg-white border border-black/8 rounded-xl p-6 mb-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xs font-semibold text-[#928b7c] uppercase tracking-wider">
              Seu Plano
            </h2>
            <div className="flex flex-wrap items-baseline gap-3 mt-2">
              {loadingAccount ? (
                <div className="h-8 w-32 bg-black/5 rounded animate-pulse" />
              ) : planInfo ? (
                <span className={`text-2xl font-bold ${planInfo.color}`}>
                  {planInfo.label}
                </span>
              ) : (
                <span className="text-2xl font-bold text-[#625f55]">Indisponivel</span>
              )}
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
            {!currentPlan || currentPlan === "free" ? "Fazer Upgrade" : "Mudar Plano"}
          </Link>
        </div>

        {planDetails && (
          <div className="border-t border-black/8 pt-4">
            <p className="text-xs text-[#928b7c] mb-2">Incluido neste plano:</p>
            <ul className="space-y-1.5">
              {planDetails.features.map((feature) => (
                <li key={feature} className="text-sm text-[#625f55] flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#c9952f]" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 rounded-lg border border-black/8 bg-[#f5f5f0] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#928b7c]">
                Portal Stripe
              </p>
              <p className="text-sm text-[#625f55]">
                {canOpenPortal
                  ? "Disponivel para gerenciar assinatura e faturas."
                  : "Indisponivel ate existir um cliente Stripe vinculado."}
              </p>
            </div>
            <button
              onClick={openBillingPortal}
              disabled={!canOpenPortal || loadingPortal}
              className="text-sm border border-black/10 text-[#625f55] px-4 py-2.5 rounded-xl hover:border-black/20 hover:text-[#171713] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingPortal ? "Abrindo..." : "Gerenciar Faturamento"}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white border border-black/8 rounded-xl p-6 mb-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        <h2 className="text-xs font-semibold text-[#928b7c] uppercase tracking-wider mb-4">
          Uso neste mes
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <UsageStat
            label="Nestings realizados"
            value={getUsageValue(account, "nestings")}
            limit={account?.limits?.nestings_limit ?? planDetails?.nestings_limit}
            loading={loadingAccount}
          />
          <UsageStat
            label="Blocos usados"
            value={getUsageValue(account, "blocks")}
            limit={account?.limits?.blocks_limit ?? planDetails?.blocks_limit}
            loading={loadingAccount}
          />
          <UsageStat
            label="Retalhos ativos"
            value={account?.usage?.remnants_active ?? null}
            loading={loadingAccount}
          />
        </div>
      </section>

      <section className="bg-white border border-black/8 rounded-xl p-6 mb-4 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.12)]">
        <h2 className="text-xs font-semibold text-[#928b7c] uppercase tracking-wider mb-4">
          API & Integracoes
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#928b7c] block mb-1">Backend URL</label>
            <code className="block text-xs bg-[#f5f5f0] border border-black/8 rounded-lg px-3 py-2 text-[#625f55] font-mono">
              {getApiBaseUrl()}
            </code>
          </div>
          <Link
            href={`${getApiBaseUrl()}/docs`}
            target="_blank"
            className="inline-block text-xs text-[#c9952f] hover:underline"
          >
            Ver documentacao OpenAPI
          </Link>
        </div>
      </section>

      <section className="border border-red-200 bg-red-50 rounded-xl p-6">
        <h2 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
          Zona de Perigo
        </h2>
        <p className="text-[#625f55] text-sm mb-4">
          Exclusao da conta e permanente e remove todos os nestings e retalhos.
        </p>
        <button
          onClick={() => alert("Use o menu de usuario do Clerk para deletar sua conta.")}
          className="text-sm border border-red-300 text-red-600 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
        >
          Deletar Conta
        </button>
      </section>
    </div>
  );
}

function AccountField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-[#f5f5f0] border border-black/6 rounded-lg p-3 min-w-0">
      <p className="text-xs text-[#928b7c]">{label}</p>
      <p className={`text-sm text-[#171713] mt-1 truncate ${mono ? "font-mono" : "font-semibold"}`}>
        {value}
      </p>
    </div>
  );
}

function UsageStat({
  label,
  value,
  limit,
  loading,
}: {
  label: string;
  value: number | null;
  limit?: number;
  loading: boolean;
}) {
  const limitText =
    limit === undefined ? "" : limit === -1 ? "/ ilimitado" : `/ ${limit}`;
  return (
    <div className="bg-[#f5f5f0] border border-black/6 rounded-lg p-3">
      <p className="text-xs text-[#928b7c]">{label}</p>
      {loading ? (
        <div className="mt-2 h-6 w-20 bg-black/5 rounded animate-pulse" />
      ) : (
        <p className="text-lg font-bold text-[#171713] mt-1">
          {value ?? "Nao informado"}
          <span className="text-xs text-[#928b7c] font-normal ml-1">{limitText}</span>
        </p>
      )}
    </div>
  );
}

function SkeletonLine() {
  return <div className="h-16 bg-black/5 rounded-lg animate-pulse" />;
}

function normalizePlan(plan?: string | null): PlanTier | null {
  if (
    plan === "free" ||
    plan === "starter" ||
    plan === "pro" ||
    plan === "enterprise"
  ) {
    return plan;
  }
  return null;
}

function getUsageValue(account: MeResponse | null, kind: "nestings" | "blocks") {
  if (!account) return null;
  const usage = account.usage ?? {};
  if (kind === "nestings") {
    return usage.nestings_this_month ?? usage.nestings_used ?? null;
  }
  return usage.blocks_this_month ?? usage.blocks_used ?? null;
}

function getCustomerId(account: MeResponse | null) {
  return (
    account?.billing?.customer_id ??
    account?.billing?.stripe_customer_id ??
    account?.stripe_customer_id ??
    null
  );
}

function getPortalAvailable(account: MeResponse | null) {
  if (!account) return false;
  if (typeof account.billing?.portal_enabled === "boolean") {
    return account.billing.portal_enabled;
  }
  if (typeof account.billing?.portal_available === "boolean") {
    return account.billing.portal_available;
  }
  if (typeof account.billing?.has_customer === "boolean") {
    return account.billing.has_customer;
  }
  return Boolean(getCustomerId(account));
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Erro desconhecido";
}
