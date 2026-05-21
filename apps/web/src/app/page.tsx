import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCode2,
  Package,
  Scissors,
  Zap,
  Layers3,
  BarChart3,
  History,
  Cpu,
  Sparkles,
  TrendingDown,
  Upload,
} from "lucide-react";

const features = [
  {
    Icon: Scissors,
    title: "Nesting 2D inteligente",
    desc: "Algoritmo avançado que maximiza utilização de material e minimiza desperdício em cada bloco de EPS. Economize até 30% em material.",
  },
  {
    Icon: FileCode2,
    title: "Geração de G-Code",
    desc: "Saídas prontas para Mach3, PlanetCNC e GRBL. Exporta coordenadas X/Y/Z/A para máquinas de fio quente com parâmetros otimizados.",
  },
  {
    Icon: Package,
    title: "Gestão de retalhos",
    desc: "Inventário inteligente de sobras. Reutilize retalhos em novos projetos e reduza custos de descarte e armazenagem.",
  },
  {
    Icon: History,
    title: "Histórico de projetos",
    desc: "Todos os projetos ficam registrados com eficiência, blocos usados e detalhes técnicos para consultas e auditoria.",
  },
];

const steps = [
  {
    number: "01",
    title: "Envie suas peças",
    description: "Defina dimensões das peças que deseja cortar, quantidades e carregue arquivos DXF ou imagens de referencias.",
    icon: Upload,
  },
  {
    number: "02",
    title: "Otimize o encaixe",
    description: "O algoritmo calcula automaticamente o melhor arranjo para maximizar eficiência e minimizar desperdício de material.",
    icon: Sparkles,
  },
  {
    number: "03",
    title: "Corte na CNC",
    description: "Exporte G-Code pronto para sua máquina de corte. Parâmetros de fio, velocidade e aceleração já otimizados.",
    icon: Cpu,
  },
];



export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-cyan-500/10 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 font-bold text-gray-950 shadow-lg shadow-cyan-500/20">
              M
            </div>
            <span className="text-lg font-bold tracking-tight">MOLDURIZE</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
            <a href="#features" className="transition-colors hover:text-cyan-400">
              Funcionalidades
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-cyan-400">
              Como funciona
            </a>
            <a href="#pricing" className="transition-colors hover:text-cyan-400">
              Planos
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/sign-in"
              className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/40 active:scale-95"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-300">
              <Zap className="h-4 w-4" />
              Para fábricas de EPS no Brasil
            </div>

            <h1 className="text-6xl font-bold tracking-tight lg:text-7xl leading-tight mb-4">
              Otimize seus cortes de EPS
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-xl">
              Economize material. Gere G-Code para sua CNC. Aumente a eficiência de corte em até 30%.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row mb-6">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-8 text-sm font-bold text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/50 active:scale-95"
              >
                Começar grátis
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-gray-700 px-8 text-sm font-semibold text-white transition-colors hover:border-gray-600 hover:bg-gray-900"
              >
                Acessar conta
              </Link>
            </div>

            <p className="text-sm text-gray-400">
              Sem cartão de crédito. Acesso completo por 30 dias.
            </p>
          </div>

          {/* Hero Visual - Dashboard Preview */}
          <div className="relative h-[400px] lg:h-[500px] rounded-2xl overflow-hidden border border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 to-transparent backdrop-blur">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-600/10 via-transparent to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <div className="rounded-xl border border-cyan-500/30 bg-gray-900/80 p-6 backdrop-blur-sm w-full max-w-sm">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-cyan-300">Exemplo Dashboard</h3>
                  <span className="px-2.5 py-1 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full border border-green-500/40">
                    Ativo
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/60 border border-gray-700/50">
                    <div className="text-xs text-gray-400 font-semibold">Projetos</div>
                    <div className="text-2xl font-bold text-cyan-400">24</div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/60 border border-gray-700/50">
                    <div className="text-xs text-gray-400 font-semibold">Eficiência média</div>
                    <div className="text-2xl font-bold text-green-400">94.2%</div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/60 border border-gray-700/50">
                    <div className="text-xs text-gray-400 font-semibold">Retalhos em estoque</div>
                    <div className="text-2xl font-bold text-blue-400">48</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Metrics */}
      <section className="border-y border-gray-800 bg-gray-900/40">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <div className="text-3xl font-bold text-cyan-400">500+</div>
              <p className="mt-2 text-sm text-gray-400">Fábricas usando</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">94%</div>
              <p className="mt-2 text-sm text-gray-400">Eficiência média</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">30%</div>
              <p className="mt-2 text-sm text-gray-400">Economia de material</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-cyan-400">3+</div>
              <p className="mt-2 text-sm text-gray-400">Perfis CNC</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-16 text-center md:text-left">
          <h2 className="text-5xl font-bold tracking-tight mb-4">
            Tudo que você precisa para otimizar
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl">
            Uma plataforma completa para nesting de EPS, geração de G-Code e gestão de retalhos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900/60 to-gray-950 p-8 backdrop-blur transition-all hover:border-cyan-500/40 hover:bg-gray-900/80"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/30 to-blue-600/30 text-cyan-400 group-hover:from-cyan-500/50 group-hover:to-blue-600/50 transition-all">
                <feature.Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-y border-gray-800 bg-gray-900/30">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mb-16 text-center md:text-left">
            <h2 className="text-5xl font-bold tracking-tight mb-4">Como funciona</h2>
            <p className="text-lg text-gray-400 max-w-2xl">
              Três passos simples para otimizar seus cortes e gerar G-Code pronto para a CNC.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step, idx) => (
              <div key={step.number} className="relative">
                {idx < steps.length - 1 && (
                  <div className="absolute top-12 -right-4 hidden h-1 w-8 bg-gradient-to-r from-cyan-500/50 to-transparent md:block" />
                )}
                <div className="rounded-xl border border-gray-800 bg-gradient-to-br from-gray-900/60 to-gray-950 p-8 backdrop-blur hover:border-cyan-500/30 transition-colors">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-3xl font-bold shadow-lg shadow-cyan-500/30">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-5xl font-bold tracking-tight mb-4">Planos simples e transparentes</h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Comece grátis. Escale conforme seu negócio cresce. Sem surpresas, sem contratos longos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            {
              name: "Iniciante",
              price: "Grátis",
              description: "Perfeito para testar",
              features: ["Até 10 projetos/mês", "2 perfis CNC", "Até 5 m² retalhos", "Suporte por email"],
            },
            {
              name: "Profissional",
              price: "R$ 99",
              period: "/mês",
              description: "Para fábricas ativas",
              features: ["Projetos ilimitados", "Todos os perfis CNC", "Retalhos ilimitados", "Suporte prioritário", "API"],
              highlight: true,
            },
            {
              name: "Empresa",
              price: "Customizado",
              description: "Solução full-service",
              features: ["Tudo do Profissional", "Múltiplos usuários", "Integrações", "SLA garantido"],
            },
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border transition-all ${
                plan.highlight
                  ? "border-cyan-500/50 bg-gradient-to-br from-cyan-500/15 to-blue-600/5 ring-2 ring-cyan-500/20 md:scale-105"
                  : "border-gray-800 bg-gradient-to-br from-gray-900/60 to-gray-950"
              } p-8`}
            >
              <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
              <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-cyan-400">{plan.price}</span>
                {plan.period && <span className="text-gray-400 text-sm ml-1">{plan.period}</span>}
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                    <CheckCircle2 className="h-5 w-5 text-cyan-400 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/sign-up"
                className={`block w-full rounded-lg px-6 py-3 text-center text-sm font-semibold transition-all ${
                  plan.highlight
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                    : "border border-gray-700 text-white hover:border-gray-600 hover:bg-gray-900/50"
                }`}
              >
                Começar agora
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-y border-gray-800 bg-gradient-to-r from-cyan-600/10 via-blue-600/10 to-cyan-600/10 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Pronto para transformar seu processo de corte?
          </h2>
          <p className="text-lg text-gray-400 mb-8 max-w-2xl mx-auto">
            Junte-se a centenas de fábricas que já aumentam eficiência e economizam material com MOLDURIZE.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/30 transition-all hover:shadow-cyan-500/50 active:scale-95"
            >
              Começar grátis
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center justify-center rounded-lg border border-gray-700 px-8 py-4 text-sm font-semibold text-white transition-colors hover:border-gray-600 hover:bg-gray-900/50"
            >
              Acessar minha conta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 font-bold text-gray-950">
                  M
                </div>
                <span className="font-bold text-sm">MOLDURIZE</span>
              </div>
              <p className="text-xs text-gray-500">
                Otimização de corte de EPS para fábricas brasileiras.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Produto</h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li><a href="#features" className="hover:text-cyan-400 transition-colors">Funcionalidades</a></li>
                <li><a href="#pricing" className="hover:text-cyan-400 transition-colors">Planos</a></li>
                <li><a href="#how-it-works" className="hover:text-cyan-400 transition-colors">Como funciona</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li><Link href="/privacy" className="hover:text-cyan-400 transition-colors">Política de Privacidade</Link></li>
                <li><Link href="/terms" className="hover:text-cyan-400 transition-colors">Termos de Serviço</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4 text-sm">Conta</h4>
              <ul className="space-y-2 text-xs text-gray-400">
                <li><Link href="/sign-in" className="hover:text-cyan-400 transition-colors">Entrar</Link></li>
                <li><Link href="/sign-up" className="hover:text-cyan-400 transition-colors">Criar conta</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-xs text-gray-500">
            <p>© 2026 MOLDURIZE. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
