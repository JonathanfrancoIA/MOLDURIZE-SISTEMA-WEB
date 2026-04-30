"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { ApiClientError, createBrowserApiClient } from "@/lib/api";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "/mês",
    desc: "Para avaliar a plataforma",
    features: ["5 nestings/mês", "1 bloco de EPS", "G-Code básico", "Suporte comunidade"],
    cta: "Começar Grátis",
    ctaHref: "/sign-up",
    highlight: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: 97,
    period: "/mês",
    desc: "Para pequenas operações",
    features: ["50 nestings/mês", "5 blocos de EPS", "G-Code básico", "Gestão de retalhos", "Suporte por email"],
    cta: "Assinar Starter",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 197,
    period: "/mês",
    desc: "Para fábricas ativas — mais popular",
    features: ["Nestings ilimitados", "Blocos ilimitados", "G-Code multi-perfil", "Importação DXF", "Assistente IA", "Suporte prioritário"],
    cta: "Assinar Pro",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 497,
    period: "/mês",
    desc: "Para grandes operações",
    features: ["Tudo do Pro", "Multi-usuário", "SSO corporativo", "API REST", "Integração ERP", "SLA 99.9%"],
    cta: "Falar com Vendas",
    highlight: false,
  },
];

export default function PricingPage() {
  if (hasClerkKey) {
    return <PricingPageWithClerk />;
  }

  return <PricingContent clerkId={null} authLoaded isSignedIn />;
}

function PricingPageWithClerk() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const getAuthToken = useCallback(async () => {
    try {
      return await getToken();
    } catch {
      return null;
    }
  }, [getToken]);

  return (
    <PricingContent
      clerkId={userId ?? null}
      authLoaded={isLoaded}
      isSignedIn={isSignedIn === true}
      getAuthToken={getAuthToken}
    />
  );
}

const hasClerkKey =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("SUBSTITUA");

type GetAuthToken = () => string | null | Promise<string | null>;

function PricingContent({
  clerkId,
  authLoaded = true,
  isSignedIn = true,
  getAuthToken,
}: {
  clerkId: string | null;
  authLoaded?: boolean;
  isSignedIn?: boolean;
  getAuthToken?: GetAuthToken;
}) {
  const checkoutApi = useMemo(() => createBrowserApiClient(getAuthToken), [getAuthToken]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(planId: string) {
    if (planId === "free") {
      window.location.href = "/sign-up";
      return;
    }
    if (planId === "enterprise") {
      window.location.href = "mailto:contato@moldurize.com.br?subject=Enterprise%20Plan";
      return;
    }

    if (hasClerkKey && !authLoaded) {
      setError("Aguarde a autenticacao carregar antes de assinar.");
      return;
    }

    if (hasClerkKey && (!isSignedIn || !clerkId)) {
      window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/pricing")}`;
      return;
    }

    setLoading(planId);
    setError(null);

    try {
      const data = await checkoutApi.createCheckout({
        plan: planId as "starter" | "pro" | "enterprise",
        clerk_id: clerkId,
        client_reference_id: clerkId,
        success_url: `${window.location.origin}/dashboard?checkout=success`,
        cancel_url: `${window.location.origin}/pricing?checkout=cancelled`,
      });
      // Redirect to Stripe Checkout (or mock URL in dev)
      window.location.href = data.checkout_url;
    } catch (e: unknown) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Erro ao processar";
      setError(msg);
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 h-16 flex items-center px-6 justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">M</span>
          </div>
          <span className="font-bold">MOLDURIZE</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-white/60 hover:text-white">← Voltar</Link>
          <Link href="/sign-in" className="text-sm text-white/60 hover:text-white">Entrar</Link>
        </div>
      </nav>

      {/* Header */}
      <div className="text-center pt-16 pb-12 px-6">
        <h1 className="text-5xl font-bold mb-4">Preços simples e transparentes</h1>
        <p className="text-white/50 text-lg max-w-xl mx-auto">
          Comece grátis. Sem cartão de crédito. Cancele quando quiser.
        </p>
        {error && (
          <div className="mt-4 inline-block bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-4 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl p-6 border flex flex-col ${
              plan.highlight
                ? "border-yellow-400 bg-yellow-400/5 relative"
                : "border-white/10 bg-[#161616]"
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                  MAIS POPULAR
                </span>
              </div>
            )}
            <div>
              <div className="text-lg font-bold mb-1">{plan.name}</div>
              <div className="text-3xl font-bold mb-1">
                {plan.price === 0 ? "Grátis" : `R$ ${plan.price}`}
                {plan.price > 0 && (
                  <span className="text-sm font-normal text-white/40">{plan.period}</span>
                )}
              </div>
              <p className="text-white/40 text-sm mb-5">{plan.desc}</p>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-yellow-400 mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-auto">
              <button
                onClick={() => handleCheckout(plan.id)}
                disabled={loading === plan.id}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  plan.highlight
                    ? "bg-yellow-400 text-black hover:bg-yellow-300"
                    : "border border-white/20 text-white hover:border-white/40"
                }`}
              >
                {loading === plan.id ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Aguarde...
                  </span>
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-bold text-center mb-8">Perguntas frequentes</h2>
        <div className="space-y-4">
          {[
            {
              q: "Preciso de cartão de crédito para o plano Free?",
              a: "Não. O plano Free é gratuito para sempre e não requer dados de pagamento.",
            },
            {
              q: "Posso cancelar a qualquer momento?",
              a: "Sim. Você pode cancelar sua assinatura a qualquer momento. O acesso permanece até o fim do período pago.",
            },
            {
              q: "Aceitam PIX e boleto?",
              a: "Sim! Aceitamos cartão de crédito, PIX e boleto bancário para clientes brasileiros.",
            },
            {
              q: "O que é o kerf?",
              a: "Kerf é a espessura do fio de corte quente. O MOLDURIZE compensa automaticamente o kerf nos cálculos de nesting.",
            },
          ].map((item) => (
            <div key={item.q} className="bg-[#161616] border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-2">{item.q}</h3>
              <p className="text-white/50 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
