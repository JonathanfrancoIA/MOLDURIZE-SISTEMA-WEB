import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-[#0f0f0f]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">M</span>
            </div>
            <span className="font-bold text-lg">MOLDURIZE</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <Link href="#features" className="hover:text-white transition-colors">
              Funcionalidades
            </Link>
            <Link href="#pricing" className="hover:text-white transition-colors">
              Preços
            </Link>
            <Link href="#about" className="hover:text-white transition-colors">
              Sobre
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2"
            >
              Entrar
            </Link>
            <Link
              href="/sign-up"
              className="text-sm bg-yellow-400 text-black font-semibold px-4 py-2 rounded-lg hover:bg-yellow-300 transition-colors"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-4 py-1.5 text-yellow-400 text-sm mb-8">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          Novo: G-Code multi-perfil para Mach3 e PlanetCNC
        </div>
        <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
          Reduza o Desperdício de{" "}
          <span className="text-yellow-400">EPS em até 30%</span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
          Otimização automática de corte 2D (Nesting), geração de G-Code para CNC e
          gestão de retalhos. Tudo em uma plataforma web para fábricas de EPS.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/sign-up"
            className="bg-yellow-400 text-black font-bold px-8 py-4 rounded-xl text-lg hover:bg-yellow-300 transition-colors"
          >
            Começar Grátis
          </Link>
          <Link
            href="#demo"
            className="border border-white/20 text-white px-8 py-4 rounded-xl text-lg hover:border-white/40 transition-colors"
          >
            Ver Demo →
          </Link>
        </div>
        <p className="text-white/30 text-sm mt-6">
          5 nestings gratuitos por mês. Sem cartão de crédito.
        </p>
      </section>

      {/* Stats */}
      <section className="border-y border-white/10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: ">90%", label: "Eficiência de nesting" },
            { value: "50k+", label: "Peças por job" },
            { value: "4-eixos", label: "Suporte CNC" },
            { value: "2.000+", label: "Empresas no Brasil" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-yellow-400">{stat.value}</div>
              <div className="text-white/50 text-sm mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            Tudo que você precisa para cortar EPS
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Do planejamento ao G-Code, automatizamos o processo completo de corte.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: "⬛",
              title: "Nesting 2D Otimizado",
              desc: "Algoritmo MaxRects + BFF posiciona automaticamente centenas de peças em blocos, minimizando o desperdício de material.",
              tags: ["Rotação automática", "Multi-bloco", "50k+ peças"],
            },
            {
              icon: "⚙️",
              title: "Geração de G-Code",
              desc: "G-Code pronto para CNC de fio quente com suporte a Mach3, PlanetCNC e GRBL. Trajetória serpentina para máxima eficiência.",
              tags: ["Mach3", "PlanetCNC", "GRBL", "4-eixos"],
            },
            {
              icon: "📦",
              title: "Gestão de Retalhos",
              desc: "Cadastre e reutilize retalhos de cortes anteriores. O sistema sugere automaticamente retalhos disponíveis para novos jobs.",
              tags: ["Estoque digital", "Reuso inteligente", "Histórico"],
            },
            {
              icon: "📊",
              title: "Relatórios de Eficiência",
              desc: "Visualize métricas de desperdício, eficiência e consumo de material por período, máquina ou operador.",
              tags: ["Dashboard", "Exportar CSV", "Por período"],
            },
            {
              icon: "📁",
              title: "Importação DXF",
              desc: "Importe peças irregulares diretamente de arquivos DXF do AutoCAD. True Shape nesting para geometrias complexas.",
              tags: ["DXF/DWG", "True Shape", "Formas livres"],
            },
            {
              icon: "👥",
              title: "Multi-usuário",
              desc: "Convide toda a equipe com controle de permissões. Planos Pro e Enterprise suportam múltiplos operadores e máquinas.",
              tags: ["Roles", "SSO", "Auditoria"],
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-[#161616] border border-white/10 rounded-2xl p-6 hover:border-yellow-400/30 transition-colors"
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-4">{f.desc}</p>
              <div className="flex flex-wrap gap-2">
                {f.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs bg-white/5 border border-white/10 rounded-full px-2.5 py-1 text-white/60"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white/[0.02] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Preços simples e transparentes</h2>
            <p className="text-white/50 text-lg">
              Comece grátis, escale quando precisar.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                name: "Free",
                price: "R$ 0",
                period: "/mês",
                desc: "Para avaliar a plataforma",
                features: [
                  "5 nestings/mês",
                  "1 bloco de EPS",
                  "G-Code básico",
                  "Suporte comunidade",
                ],
                cta: "Começar Grátis",
                highlight: false,
              },
              {
                name: "Starter",
                price: "R$ 97",
                period: "/mês",
                desc: "Para pequenas operações",
                features: [
                  "50 nestings/mês",
                  "5 blocos de EPS",
                  "G-Code básico",
                  "Gestão de retalhos",
                  "Suporte por email",
                ],
                cta: "Assinar Starter",
                highlight: false,
              },
              {
                name: "Pro",
                price: "R$ 197",
                period: "/mês",
                desc: "Para fábricas ativas",
                features: [
                  "Nestings ilimitados",
                  "Blocos ilimitados",
                  "G-Code multi-perfil",
                  "Importação DXF",
                  "Assistente IA",
                  "Suporte prioritário",
                ],
                cta: "Assinar Pro",
                highlight: true,
              },
              {
                name: "Enterprise",
                price: "R$ 497",
                period: "/mês",
                desc: "Para grandes operações",
                features: [
                  "Tudo do Pro",
                  "Multi-usuário",
                  "SSO corporativo",
                  "API REST",
                  "Integração ERP",
                  "SLA 99.9%",
                ],
                cta: "Falar com Vendas",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border ${
                  plan.highlight
                    ? "border-yellow-400 bg-yellow-400/5"
                    : "border-white/10 bg-[#161616]"
                }`}
              >
                {plan.highlight && (
                  <div className="text-xs font-bold text-yellow-400 bg-yellow-400/10 rounded-full px-3 py-1 inline-block mb-3">
                    MAIS POPULAR
                  </div>
                )}
                <div className="text-lg font-bold mb-1">{plan.name}</div>
                <div className="text-3xl font-bold mb-1">
                  {plan.price}
                  <span className="text-sm font-normal text-white/50">{plan.period}</span>
                </div>
                <p className="text-white/50 text-sm mb-6">{plan.desc}</p>
                <ul className="space-y-2 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                      <span className="text-yellow-400">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-colors ${
                    plan.highlight
                      ? "bg-yellow-400 text-black hover:bg-yellow-300"
                      : "border border-white/20 text-white hover:border-white/40"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-bold mb-4">
          Pronto para otimizar seus cortes?
        </h2>
        <p className="text-white/50 text-lg mb-8 max-w-xl mx-auto">
          Junte-se a centenas de fábricas de EPS que já reduzem o desperdício com MOLDURIZE.
        </p>
        <Link
          href="/sign-up"
          className="inline-block bg-yellow-400 text-black font-bold px-10 py-4 rounded-xl text-lg hover:bg-yellow-300 transition-colors"
        >
          Começar Grátis Agora
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-400 rounded flex items-center justify-center">
              <span className="text-black font-bold text-xs">M</span>
            </div>
            <span className="font-bold">MOLDURIZE</span>
          </div>
          <p className="text-white/30 text-sm">
            © 2026 MOLDURIZE. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm text-white/50">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacidade
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Termos
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
