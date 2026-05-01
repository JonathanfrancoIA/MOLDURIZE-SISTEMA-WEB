import Link from "next/link";
import {
  ArrowRight,
  Check,
  FileCode2,
  FileText,
  LayoutGrid,
  PackageOpen,
  Scissors,
  Settings,
  Users,
} from "lucide-react";

const features = [
  {
    Icon: Scissors,
    title: "Nesting 2D operacional",
    desc: "Monte jobs de corte, ajuste blocos de EPS e calcule encaixes com uma interface direta para producao.",
    tags: ["Multi-bloco", "Kerf", "Recalculo rapido"],
  },
  {
    Icon: FileCode2,
    title: "G-Code para fio quente",
    desc: "Gere saidas para perfis CNC usados na operacao, com parametros de maquina visiveis antes do download.",
    tags: ["Mach3", "PlanetCNC", "GRBL"],
  },
  {
    Icon: PackageOpen,
    title: "Retalhos reutilizaveis",
    desc: "Registre sobras por dimensao e status para manter o estoque reaproveitavel dentro do fluxo de corte.",
    tags: ["Inventario", "Reuso", "Status"],
  },
  {
    Icon: FileText,
    title: "Historico de jobs",
    desc: "Acompanhe projetos processados, eficiencia e datas sem depender de planilhas paralelas.",
    tags: ["Busca por lote", "Auditoria", "Resumo"],
  },
  {
    Icon: LayoutGrid,
    title: "Dashboard claro",
    desc: "Veja uso, blocos consumidos e retalhos ativos em telas pensadas para rotina de fabrica.",
    tags: ["Uso mensal", "Indicadores", "Alertas"],
  },
  {
    Icon: Users,
    title: "Login individual",
    desc: "Acesso por conta individual para manter a jornada principal focada no app e na API.",
    tags: ["Conta", "Sessao", "API"],
  },
];

const operationItems = [
  {
    name: "Conta e acesso",
    desc: "Login individual, dados da conta e leitura de limites em uma area unica.",
    features: ["Entrar no app", "Conferir sessao", "Ver uso mensal"],
    href: "/sign-in",
    cta: "Entrar no app",
    highlight: true,
  },
  {
    name: "Corte e nesting",
    desc: "Ferramentas principais para preparar pecas, blocos e saida CNC.",
    features: ["Criar job", "Gerar G-Code", "Abrir historico"],
    href: "/nesting",
    cta: "Abrir nesting",
    highlight: false,
  },
  {
    name: "Retalhos",
    desc: "Inventario operacional para reaproveitamento de material antes do descarte.",
    features: ["Cadastrar sobra", "Filtrar status", "Controlar area"],
    href: "/remnants",
    cta: "Abrir retalhos",
    highlight: false,
  },
  {
    name: "API",
    desc: "Base URL e documentacao tecnica ficam em Settings para integracao com o backend.",
    features: ["OpenAPI", "Ambiente dev", "Integracoes"],
    href: "/settings",
    cta: "Ver ajustes",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0f0f0f] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0f0f]/86 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2c767]">
              <span className="text-sm font-bold text-[#171713]">M</span>
            </div>
            <span className="truncate text-lg font-bold">MOLDURIZE</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <Link href="#features" className="transition-colors hover:text-white">
              Funcionalidades
            </Link>
            <Link href="#operation" className="transition-colors hover:text-white">
              Operacao
            </Link>
            <Link href="#about" className="transition-colors hover:text-white">
              Sobre
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:text-white sm:px-4"
            >
              Entrar
            </Link>
            <Link
              href="/sign-up"
              className="rounded-lg bg-[#f2c767] px-3 py-2 text-sm font-semibold text-[#171713] transition-colors hover:bg-[#f6d98b] sm:px-4"
            >
              Criar acesso
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-16 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#f2c767]/25 bg-[#f2c767]/10 px-4 py-1.5 text-sm text-[#f2c767]">
            <span className="h-2 w-2 rounded-full bg-[#f2c767]" />
            App operacional para corte EPS
          </div>
          <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            Operacao de corte EPS com nesting, G-Code e retalhos.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-white/62 md:text-lg">
            Planeje jobs de corte 2D, gere saida para CNC de fio quente e mantenha o estoque de sobras em um fluxo web focado em producao.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-in"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#f2c767] px-6 text-sm font-bold text-[#171713] transition-all duration-200 hover:bg-[#f6d98b] active:-translate-y-[1px]"
            >
              Entrar no app
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center rounded-xl border border-white/18 px-6 text-sm font-semibold text-white transition-colors hover:border-white/38"
            >
              Criar acesso individual
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/38">
            Pagamentos ficam fora da jornada principal. A prioridade e operar o app com login individual.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#171713] p-4 shadow-[0_30px_90px_-60px_rgba(0,0,0,0.95)]">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#f2c767]">Hoje</p>
              <p className="text-sm font-semibold text-white">Painel de corte</p>
            </div>
            <span className="rounded-md border border-green-400/25 bg-green-400/10 px-2 py-1 text-xs font-semibold text-green-300">
              Operacional
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Jobs", "12"],
              ["Efic.", "91.4%"],
              ["Retalhos", "28"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/42">{label}</p>
                <p className="mt-1 font-mono text-lg font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {[
              ["Lote EPS A-104", "G-Code pronto"],
              ["Retalho 1500 x 600", "Disponivel"],
              ["API local", "Conectada"],
            ].map(([label, status]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="text-sm text-white/74">{label}</span>
                <span className="text-xs font-semibold text-[#f2c767]">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 text-left sm:px-6 md:grid-cols-4">
          {[
            { value: "4 eixos", label: "Perfis CNC suportados" },
            { value: "API", label: "Backend documentado" },
            { value: "m2", label: "Area de retalhos" },
            { value: "G-Code", label: "Saida de producao" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-[#f2c767]">{stat.value}</div>
              <div className="mt-1 text-sm text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Fluxo completo para a rotina de corte
          </h2>
          <p className="mt-3 text-base leading-7 text-white/52">
            Do planejamento ao inventario de sobras, as telas principais priorizam leitura rapida e acao direta.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {features.map(({ Icon, title, desc, tags }) => (
            <div
              key={title}
              className="rounded-xl border border-white/10 bg-[#161616] p-5 transition-colors hover:border-[#f2c767]/32"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-[#f2c767]/20 bg-[#f2c767]/10 text-[#f2c767]">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/52">{desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/62"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="operation" className="border-y border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Operacao antes de pagamentos</h2>
            <p className="mt-3 text-base leading-7 text-white/52">
              A jornada principal leva o usuario ao app. Acoes comerciais e portais pagos nao bloqueiam o uso operacional.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            {operationItems.map((item) => (
              <div
                key={item.name}
                className={`rounded-xl border p-5 ${
                  item.highlight
                    ? "border-[#f2c767]/60 bg-[#f2c767]/10"
                    : "border-white/10 bg-[#161616]"
                }`}
              >
                {item.highlight && (
                  <div className="mb-3 inline-block rounded-full bg-[#f2c767]/12 px-3 py-1 text-xs font-bold text-[#f2c767]">
                    Principal
                  </div>
                )}
                <div className="mb-2 text-lg font-bold">{item.name}</div>
                <p className="mb-6 text-sm leading-6 text-white/52">{item.desc}</p>
                <ul className="mb-8 space-y-2">
                  {item.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-white/70">
                      <Check className="h-4 w-4 text-[#f2c767]" strokeWidth={1.8} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={item.href}
                  className={`block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                    item.highlight
                      ? "bg-[#f2c767] text-[#171713] hover:bg-[#f6d98b]"
                      : "border border-white/20 text-white hover:border-white/40"
                  }`}
                >
                  {item.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-4 py-20 text-left sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Pronto para operar o corte?
          </h2>
          <p className="mt-3 text-base leading-7 text-white/52">
            Entre no app, confira sua conta e use as telas de nesting, historico, retalhos e API.
          </p>
          <Link
            href="/sign-in"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-xl bg-[#f2c767] px-6 text-sm font-bold text-[#171713] transition-colors hover:bg-[#f6d98b]"
          >
            Abrir app
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#f2c767]">
              <span className="text-xs font-bold text-[#171713]">M</span>
            </div>
            <span className="font-bold">MOLDURIZE</span>
          </div>
          <p className="text-sm text-white/30">(c) 2026 MOLDURIZE. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm text-white/50">
            <Link href="/privacy" className="transition-colors hover:text-white">
              Privacidade
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white">
              Termos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
