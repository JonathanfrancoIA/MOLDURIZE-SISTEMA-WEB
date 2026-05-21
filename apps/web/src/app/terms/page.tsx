"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#171713]">
      {/* Header */}
      <header className="bg-white border-b border-black/10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight text-[#171713]">Termos de Serviço</h1>
          <p className="text-sm text-[#625f55] mt-2">Última atualização: 5 de maio de 2026</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <article className="prose prose-sm max-w-none space-y-8">
          {/* Introdução */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">Introdução</h2>
            <p className="text-[#625f55] leading-relaxed">
              Bem-vindo aos Termos de Serviço (&quot;Termos&quot;) da MOLDURIZE (&quot;Empresa&quot;, &quot;nós&quot;, &quot;nosso&quot;). Estes Termos regem seu acesso e uso
              de nossa plataforma SaaS de otimização de corte de EPS e geração de G-Code para CNC (&quot;Serviço&quot;), incluindo nosso site,
              aplicações web e APIs associadas.
            </p>
            <p className="text-[#625f55] leading-relaxed mt-4">
              Ao acessar e usar a MOLDURIZE, você concorda em obedecer todos os Termos aqui descritos. Se você não concordar, não use o Serviço.
              Reservamos o direito de atualizar estes Termos a qualquer momento, notificando-o adequadamente.
            </p>
          </section>

          {/* 1. Elegibilidade e Contas */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">1. Elegibilidade e Contas</h2>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">1.1 Elegibilidade</h3>
            <p className="text-[#625f55] leading-relaxed">
              Você declara que tem pelo menos 18 anos de idade (ou a idade legal de maioridade em sua jurisdição) e autoridade legal
              para aceitar estes Termos. Pessoas jurídicas podem usar o Serviço mediante designação de representante autorizado.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">1.2 Criação de Conta</h3>
            <p className="text-[#625f55] leading-relaxed">
              Para usar o Serviço, você deve criar uma conta fornecendo informações precisas, completas e atualizadas.
              Você é responsável por manter a confidencialidade de suas credenciais de login e por toda atividade em sua conta.
              Notifique-nos imediatamente de qualquer uso não autorizado.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">1.3 Responsabilidade da Conta</h3>
            <p className="text-[#625f55] leading-relaxed">
              Você é totalmente responsável pela segurança de sua conta. Não compartilhe suas credenciais com terceiros.
              A Empresa não é responsável por perda de dados ou acesso não autorizado resultante de sua negligência.
            </p>
          </section>

          {/* 2. Descrição do Serviço */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">2. Descrição do Serviço</h2>
            <p className="text-[#625f55] leading-relaxed">
              MOLDURIZE oferece uma plataforma para otimização de aninhamento (nesting) de blocos de EPS e geração de G-Code
              para máquinas CNC. Os recursos incluem:
            </p>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2 mt-4">
              <li>Processamento de designs DXF/STL e geração de padrões de corte otimizados.</li>
              <li>Cálculo de eficiência material e estimativa de resíduos.</li>
              <li>Geração de G-Code customizado para máquinas CNC.</li>
              <li>Gestão de inventário de retalhos (remnants).</li>
              <li>Histórico de projetos e análise de desempenho.</li>
            </ul>
            <p className="text-[#625f55] leading-relaxed mt-4">
              O Serviço é fornecido &quot;COMO ESTÁ&quot;, sem garantias de disponibilidade contínua ou ausência de erros.
            </p>
          </section>

          {/* 3. Planos de Preço e Pagamento */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">3. Planos de Preço e Pagamento</h2>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">3.1 Planos Disponíveis</h3>
            <p className="text-[#625f55] leading-relaxed">
              Oferecemos vários planos de assinatura com diferentes níveis de funcionalidade. Consulte nossa página de preços
              para detalhes atualizados sobre funcionalidades, limites de uso e custos.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">3.2 Pagamento e Faturamento</h3>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2">
              <li>Assinaturas são cobradas antecipadamente no início de cada período de faturamento.</li>
              <li>Aceitamos cartões de crédito, débito e outras formas de pagamento seguras.</li>
              <li>As cobranças continuam automaticamente até que a assinatura seja cancelada.</li>
              <li>Os recibos são enviados por e-mail após cada transação.</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">3.3 Ajustes de Preços</h3>
            <p className="text-[#625f55] leading-relaxed">
              Reservamos o direito de alterar preços com aviso prévio de 30 dias. Alterações não afetam assinaturas ativas
              até o próximo período de renovação.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">3.4 Política de Reembolso</h3>
            <p className="text-[#625f55] leading-relaxed">
              Oferecemos uma garantia de satisfação de 7 dias para novos usuários. Reembolsos são processados ao método de pagamento original.
              Não são reembolsáveis as assinaturas após 7 dias de uso ativo. Entre em contato com suporte para solicitar reembolso.
            </p>
          </section>

          {/* 4. Uso Aceitável */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">4. Uso Aceitável</h2>
            <p className="text-[#625f55] leading-relaxed">
              Você concorda em usar o Serviço apenas para fins legítimos e de acordo com estes Termos. Atividades proibidas incluem:
            </p>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2 mt-4">
              <li>Violar leis, regulações ou direitos de terceiros.</li>
              <li>Tentar ganhar acesso não autorizado a sistemas da Empresa.</li>
              <li>Usar técnicas de engenharia reversa, descompilação ou hacking.</li>
              <li>Rescrever, remover ou obscurecer conteúdo de propriedade intelectual.</li>
              <li>Transmitir malware, spam, conteúdo prejudicial ou ilegal.</li>
              <li>Usar scraping, automação ou bots sem autorização.</li>
              <li>Compartilhar credenciais ou revender acesso a terceiros.</li>
              <li>Exceder intencionalmente limites de uso ou causar abuso de recursos.</li>
              <li>Impersonar pessoas ou entidades ou fazer representações falsas.</li>
              <li>Interferir com operação ou segurança do Serviço.</li>
            </ul>
          </section>

          {/* 5. Propriedade Intelectual */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">5. Propriedade Intelectual</h2>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">5.1 Propriedade da Empresa</h3>
            <p className="text-[#625f55] leading-relaxed">
              A plataforma MOLDURIZE, incluindo software, designs, conteúdo, documentação e algoritmos, é propriedade exclusiva da Empresa
              e protegida por leis de propriedade intelectual. Você recebe apenas uma licença limitada, não exclusiva e revogável para usar
              o Serviço para fins comerciais legítimos.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">5.2 Seus Dados e Conteúdo</h3>
            <p className="text-[#625f55] leading-relaxed">
              Você mantém todos os direitos sobre dados, projetos e conteúdo que você carrega (&quot;Seu Conteúdo&quot;). Ao usar o Serviço,
              você concede à Empresa uma licença limitada para usar Seu Conteúdo conforme necessário para fornecer o Serviço,
              incluindo armazenamento, processamento e análise.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">5.3 Dados Agregados e Insights</h3>
            <p className="text-[#625f55] leading-relaxed">
              Podemos coletar dados agregados e anônimos sobre uso do Serviço para análise, melhorias de produto e relatórios de mercado.
              Esses dados não identificam você pessoalmente e podem ser usados livremente pela Empresa.
            </p>
          </section>

          {/* 6. Limitações de Responsabilidade */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">6. Limitações de Responsabilidade</h2>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">6.1 Isenção de Garantias</h3>
            <p className="text-[#625f55] leading-relaxed">
              O Serviço é fornecido &quot;COMO ESTÁ&quot; e &quot;CONFORME DISPONÍVEL&quot;, sem garantias de qualquer espécie, expressas ou implícitas.
              Especificamente, a Empresa NÃO garante que:
            </p>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2 mt-4">
              <li>O Serviço será ininterrupto ou livre de erros.</li>
              <li>Os resultados de otimização serão precisos ou adequados para sua aplicação específica.</li>
              <li>Qualquer conteúdo está livre de vírus ou componentes prejudiciais.</li>
              <li>O Serviço atenderá seus requisitos específicos.</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">6.2 Limitação de Responsabilidade</h3>
            <p className="text-[#625f55] leading-relaxed">
              Exceto onde proibido por lei, em nenhum caso a Empresa será responsável por danos indiretos, incidentais, especiais,
              consequentes ou punitivos (incluindo perda de lucros, receita, dados ou boa vontade), mesmo que tenha sido avisada
              da possibilidade desses danos. A responsabilidade total da Empresa não excede o valor pago por você nos últimos 12 meses.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">6.3 Seu Risco</h3>
            <p className="text-[#625f55] leading-relaxed">
              Você aceita que otimizações de corte e G-Codes gerados devem ser verificados independentemente antes de aplicação
              em máquinas CNC. A Empresa não é responsável por erros, danos materiais ou lesões resultantes de confiança inadequada
              nos resultados do Serviço.
            </p>
          </section>

          {/* 7. Indenização */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">7. Indenização</h2>
            <p className="text-[#625f55] leading-relaxed">
              Você concorda em indenizar, defender e manter a Empresa inócua contra qualquer reclamação, demanda, perda ou despesa
              (incluindo honorários advocatícios) decorrente de:
            </p>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2 mt-4">
              <li>Seu uso do Serviço ou acesso a ele.</li>
              <li>Violação destes Termos.</li>
              <li>Infringimento de direitos de terceiros por Seu Conteúdo.</li>
              <li>Atividades ilegais ou prejudiciais realizadas em sua conta.</li>
            </ul>
          </section>

          {/* 8. Interrupção e Cancelamento */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">8. Interrupção e Cancelamento</h2>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">8.1 Cancelamento por Você</h3>
            <p className="text-[#625f55] leading-relaxed">
              Você pode cancelar sua assinatura a qualquer momento através das configurações de conta. O cancelamento entra em vigor
              no final do período de faturamento atual. Nenhum reembolso é fornecido para períodos parciais, exceto conforme política
              de garantia de 7 dias.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">8.2 Cancelamento pela Empresa</h3>
            <p className="text-[#625f55] leading-relaxed">
              A Empresa pode interromper o acesso ao Serviço a qualquer momento, com ou sem causa, com notificação de 30 dias ou imediatamente
              se você violar estes Termos ou lei aplicável. Isso inclui:
            </p>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2 mt-4">
              <li>Não pagamento de taxas devidas.</li>
              <li>Violação grave destes Termos.</li>
              <li>Atividades fraudulentas ou ilegais.</li>
              <li>Abuso de recursos ou ameaça ao funcionamento do Serviço.</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">8.3 Manutenção Planejada</h3>
            <p className="text-[#625f55] leading-relaxed">
              A Empresa pode indisponibilizar o Serviço para manutenção. Tentaremos minimizar interrupções e forneceremos aviso
              quando possível. Interrupções por manutenção não geram crédito ou compensação.
            </p>
          </section>

          {/* 9. Conformidade e Atualizações */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">9. Conformidade e Atualizações</h2>
            <p className="text-[#625f55] leading-relaxed">
              Você é responsável por garantir que seu uso do Serviço está em conformidade com leis aplicáveis, incluindo regulamentações
              ambientais, de segurança e de trabalho em sua jurisdição. Você concorda em usar o Serviço de forma responsável e segura.
            </p>
            <p className="text-[#625f55] leading-relaxed mt-4">
              A Empresa pode atualizar o Serviço, alterar recursos ou descontinuar funcionalidades a qualquer momento. Alterações significativas
              serão comunicadas com aviso razoável.
            </p>
          </section>

          {/* 10. Privacidade e Dados */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">10. Privacidade e Dados</h2>
            <p className="text-[#625f55] leading-relaxed">
              Seu uso do Serviço está sujeito à nossa Política de Privacidade. Recomendamos que você a leia cuidadosamente.
              Ao usar o Serviço, você concorda com as práticas de privacidade descritas nela.
            </p>
          </section>

          {/* 11. Ligação de Terceiros */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">11. Links de Terceiros</h2>
            <p className="text-[#625f55] leading-relaxed">
              O Serviço pode conter links para sites ou serviços de terceiros. Não somos responsáveis pelo conteúdo, precisão ou
              conformidade desses links. Seu uso deles está sujeito aos seus termos e políticas de privacidade.
            </p>
          </section>

          {/* 12. Resolução de Disputas */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">12. Resolução de Disputas</h2>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">12.1 Lei Aplicável</h3>
            <p className="text-[#625f55] leading-relaxed">
              Estes Termos serão regidos e interpretados de acordo com as leis da República Federativa do Brasil,
              sem considerar princípios de conflito de leis.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">12.2 Foro Competente</h3>
            <p className="text-[#625f55] leading-relaxed">
              Qualquer disputa decorrente destes Termos ou uso do Serviço será submetida aos tribunais competentes do Brasil.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">12.3 Resolução Amigável</h3>
            <p className="text-[#625f55] leading-relaxed">
              Antes de qualquer ação legal, as partes tentarão resolver disputas por negociação amigável. Agradecemos que
              entre em contato conosco primeiro com detalhes de sua preocupação.
            </p>
          </section>

          {/* 13. Disposições Gerais */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">13. Disposições Gerais</h2>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">13.1 Acordo Integral</h3>
            <p className="text-[#625f55] leading-relaxed">
              Estes Termos, junto com a Política de Privacidade e quaisquer documentos incorporados por referência, constituem
              o acordo integral entre você e a Empresa e superam todos os acordos anteriores.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">13.2 Modificações</h3>
            <p className="text-[#625f55] leading-relaxed">
              A Empresa pode alterar estes Termos a qualquer momento. As alterações significativas serão comunicadas por e-mail
              ou aviso destacado no Serviço. Seu uso contínuo implica aceitação das alterações.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">13.3 Separabilidade</h3>
            <p className="text-[#625f55] leading-relaxed">
              Se qualquer disposição destes Termos for considerada inválida ou inaplicável, as demais disposições permanecerão em vigor.
            </p>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">13.4 Ausência de Renúncia</h3>
            <p className="text-[#625f55] leading-relaxed">
              A falha em fazer cumprir qualquer direito ou disposição não constitui renúncia desse direito ou disposição.
            </p>
          </section>

          {/* 14. Contato */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">14. Contato</h2>
            <p className="text-[#625f55] leading-relaxed">
              Se você tiver perguntas sobre estes Termos ou sobre o Serviço, entre em contato:
            </p>
            <div className="mt-4 p-4 bg-white border border-black/10 rounded-lg">
              <p className="text-[#171713] font-semibold">MOLDURIZE</p>
              <p className="text-[#625f55] text-sm">E-mail: support@moldurize.com</p>
              <p className="text-[#625f55] text-sm">Site: www.moldurize.com</p>
            </div>
          </section>
        </article>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-black/10 flex justify-center gap-6 text-sm">
          <Link href="/" className="text-[#c9952f] hover:text-[#8b651f] font-semibold">
            Voltar ao Início
          </Link>
          <Link href="/privacy" className="text-[#c9952f] hover:text-[#8b651f] font-semibold">
            Política de Privacidade
          </Link>
        </div>
      </main>
    </div>
  );
}
