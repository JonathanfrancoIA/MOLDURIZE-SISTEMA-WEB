"use client";

import { useEffect, useState } from "react";
import { PieChart, TrendingUp, Scissors, Package, LayoutGrid, Clock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { api, NestingSummary } from "@/lib/api";

export default function DashboardPage() {
  const [nestings, setNestings] = useState<NestingSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listNestings()
      .then(setNestings)
      .catch((err) => console.error("Falha ao buscar Projetos:", err))
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="min-h-full bg-[#080808] text-white p-8 overflow-y-auto">
      
      {/* ─── HEADER ─── */}
      <header className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Visão Geral</h1>
          <p className="text-[#888] text-sm">Acompanhe a eficiência da sua fábrica de EPS.</p>
        </div>
        <Link 
          href="/nesting"
          className="bg-white text-black font-semibold text-sm px-5 py-2.5 hover:bg-[#e0e0e0] transition-colors flex items-center gap-2"
        >
          <Scissors className="w-4 h-4" />
          Novo Projeto de Corte
        </Link>
      </header>

      {/* ─── METRICS GRID (Sharp edges, high contrast) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Metric 1 */}
        <div className="bg-[#161616] p-6 border border-[#222] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#888] font-mono text-xs uppercase tracking-widest">Economia Estimada</h3>
            <span className="p-2 bg-yellow-500/10 text-yellow-500">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">R$ 2.450</div>
          <div className="text-xs text-green-500 flex items-center gap-1 font-mono">
            <span>+12.5%</span> <span className="text-[#666]">vs mês anterior</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#161616] p-6 border border-[#222] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-white transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#888] font-mono text-xs uppercase tracking-widest">Jobs Processados</h3>
            <span className="p-2 bg-[#222] text-[#888]">
              <LayoutGrid className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-4xl font-bold text-white mb-2">47</div>
            <span className="text-xs text-[#666] font-mono">NESTS</span>
          </div>
          <div className="text-xs text-[#888] font-mono">
            Último há 45 min
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#161616] p-6 border border-[#222] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-[#888] font-mono text-xs uppercase tracking-widest">Eficiência Média</h3>
            <span className="p-2 bg-yellow-500/10 text-yellow-500">
              <PieChart className="w-5 h-5" />
            </span>
          </div>
          <div className="text-4xl font-bold text-white mb-2">91.8%</div>
          <div className="text-xs text-yellow-500 flex items-center gap-1 font-mono">
            <span>Alvo: 90.0%</span> <span className="text-[#666]">| OK</span>
          </div>
        </div>

      </div>

      {/* ─── RECENT & REMNANTS SPLIT ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Recentes */}
        <section className="bg-[#0c0c0c] border border-[#222] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#888] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Projetos Recentes
            </h2>
            <button className="text-xs font-mono text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1">
              VER TODOS <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          <div className="space-y-3">
            {loading ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#161616] border border-[#222]">
                <Loader2 className="w-6 h-6 animate-spin text-[#888] mb-2" />
                <span className="text-[#666] text-xs font-mono">Sincronizando com a Nuvem...</span>
              </div>
            ) : nestings.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 bg-[#161616] border border-[#222]">
                <span className="text-[#666] text-xs font-mono mb-2">Nenhum projeto encontrado.</span>
                <Link href="/nesting" className="text-yellow-500 hover:text-yellow-400 text-xs font-bold uppercase transition-colors">
                  CRIAR O PRIMEIRO
                </Link>
              </div>
            ) : (
              nestings.map((proj) => {
                const displayId = `NS-${proj.id.substring(0, 4).toUpperCase()}`;
                const efficiency = proj.waste_percent != null
                  ? `${(100 - proj.waste_percent).toFixed(1)}%`
                  : "—";
                const blocksText = proj.total_blocks != null
                  ? `${proj.total_blocks} ${proj.total_blocks === 1 ? "bloco" : "blocos"}`
                  : "—";

                return (
                  <div key={proj.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#161616] border border-[#222] hover:border-[#444] transition-colors group cursor-pointer">
                    <div>
                      <div className="text-xs font-mono text-yellow-500 mb-1">{displayId}</div>
                      <div className="font-bold text-sm text-white group-hover:underline">{(proj.name || "Projeto sem nome").substring(0, 30)}</div>
                    </div>
                    <div className="mt-2 sm:mt-0 text-right">
                      <div className="text-lg font-bold text-white">{efficiency} <span className="text-[10px] text-[#666] uppercase font-mono">Eficiência</span></div>
                      <div className="text-[#666] text-xs font-mono">{blocksText}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Estoque Retalhos */}
        <section className="bg-[#0c0c0c] border border-[#222] p-6">
           <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#888] flex items-center gap-2">
              <Package className="w-4 h-4" />
              Estoque de Retalhos (Top)
            </h2>
            <button className="text-xs font-mono text-yellow-500 hover:text-yellow-400 transition-colors flex items-center gap-1">
              INVENTÁRIO <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3">
            {[
              { dim: "1010 x 450 mm", status: "Disponível", age: "2 dias" },
              { dim: "800 x 320 mm", status: "Disponível", age: "3 dias" },
              { dim: "1200 x 180 mm", status: "Reservado", age: "5 dias", reserved: true },
              { dim: "2000 x 200 mm", status: "Disponível", age: "6 dias" },
            ].map((scrap, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#161616] border border-[#222] hover:border-[#444] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-1.5 h-8 ${scrap.reserved ? 'bg-[#444]' : 'bg-green-500'}`} />
                  <div>
                    <div className="font-mono text-sm font-bold text-white tracking-wide">{scrap.dim}</div>
                    <div className="text-xs text-[#666] mt-1">{scrap.age}</div>
                  </div>
                </div>
                <div>
                  <span className={`text-[10px] font-mono px-2 py-1 uppercase font-bold border ${scrap.reserved ? 'text-[#888] border-[#444] bg-[#222]' : 'text-green-500 border-green-500/30 bg-green-500/10'}`}>
                    {scrap.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
