"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#171713]">
      {/* Header */}
      <header className="bg-white border-b border-black/10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight text-[#171713]">Política de Privacidade</h1>
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
              A MOLDURIZE (&quot;Empresa&quot;, &quot;nós&quot;, &quot;nosso&quot;) está comprometida em proteger sua privacidade. Esta Política de Privacidade
              explica como coletamos, usamos, divulgamos e protegemos suas informações quando você utiliza nossa plataforma SaaS
              de otimização de corte de EPS e geração de G-Code para CNC (&quot;Serviço&quot;).
            </p>
            <p className="text-[#625f55] leading-relaxed mt-4">
              Por favor, leia esta política cuidadosamente. Ao acessar e usar a MOLDURIZE, você concorda com os termos descritos aqui.
              Se você não concordar com nossas práticas de privacidade, não use nosso Serviço.
            </p>
          </section>

          {/* 1. Informações que Coletamos */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">1. Informações que Coletamos</h2>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">1.1 Informações Fornecidas por Você</h3>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2">
              <li><strong>Dados de Conta:</strong> Nome, endereço de e-mail, senha (criptografada), informações de perfil.</li>
              <li><strong>Dados de Pagamento:</strong> Informações de faturamento, método de pagamento (processado através de provedores terceirizados seguros).</li>
              <li><strong>Dados de Projeto:</strong> Dimensões de blocos de EPS, especificações de corte, parâmetros de CNC, arquivos DXF ou STL.</li>
              <li><strong>Dados de Comunicação:</strong> Mensagens, comentários, feedback ou consultas ao suporte.</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">1.2 Informações Coletadas Automaticamente</h3>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2">
              <li><strong>Dados de Uso:</strong> Páginas visitadas, duração da sessão, cliques, recursos utilizados.</li>
              <li><strong>Informações do Dispositivo:</strong> Tipo de navegador, sistema operacional, endereço IP, identificadores de dispositivo.</li>
              <li><strong>Cookies e Tecnologias Similares:</strong> Identificadores de sessão, preferências de usuário, rastreamento de atividade.</li>
              <li><strong>Dados de Desempenho:</strong> Velocidade de carregamento, erros de aplicação, taxa de conversão.</li>
            </ul>

            <h3 className="text-lg font-semibold text-[#171713] mt-6 mb-3">1.3 Informações de Terceiros</h3>
            <p className="text-[#625f55] leading-relaxed">
              Podemos receber informações sobre você de terceiros, como provedores de autenticação (ex.: Clerk), processadores de pagamento
              e serviços de análise. Essas informações são usadas para melhorar a segurança e a experiência do usuário.
            </p>
          </section>

          {/* 2. Como Usamos Suas Informações */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">2. Como Usamos Suas Informações</h2>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2">
              <li><strong>Provisão do Serviço:</strong> Criar e manter sua conta, processar transações, entregar funcionalidades da plataforma.</li>
              <li><strong>Comunicação:</strong> Enviar notificações de conta, atualizações de sistema, alertas de segurança e responder consultas.</li>
              <li><strong>Análise e Melhoria:</strong> Entender padrões de uso, otimizar desempenho, desenvolver novos recursos.</li>
              <li><strong>Conformidade Legal:</strong> Cumprir obrigações regulatórias, aplicar nossos Termos de Serviço e proteger direitos legais.</li>
              <li><strong>Segurança:</strong> Detectar fraude, prevenir abuso, proteger contra atividades prejudiciais.</li>
              <li><strong>Marketing:</strong> Enviar promoções, novidades sobre produtos e ofertas (apenas com seu consentimento).</li>
            </ul>
          </section>

          {/* 3. Compartilhamento de Dados */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">3. Compartilhamento de Dados</h2>
            <p className="text-[#625f55] leading-relaxed">
              Não vendemos, alugamos ou divulgamos suas informações pessoais a terceiros sem seu consentimento, exceto nos seguintes casos:
            </p>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2 mt-4">
              <li><strong>Prestadores de Serviço:</strong> Compartilhamos dados com provedores que nos auxiliam na operação do Serviço (hospedagem, análise, processamento de pagamento), sob contratos de confidencialidade.</li>
              <li><strong>Conformidade Legal:</strong> Divulgamos dados quando exigido por lei ou para proteger nossos direitos, privacidade, segurança ou propriedade.</li>
              <li><strong>Transferência de Negócio:</strong> Em caso de venda, fusão ou aquisição, suas informações podem ser transferidas como parte do ativo.</li>
              <li><strong>Consentimento Explícito:</strong> Compartilhamos com seu consentimento direto para fins específicos.</li>
            </ul>
          </section>

          {/* 4. Armazenamento e Segurança */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">4. Armazenamento e Segurança</h2>
            <p className="text-[#625f55] leading-relaxed">
              Implementamos medidas técnicas, administrativas e físicas para proteger suas informações contra acesso não autorizado,
              alteração, divulgação ou destruição. Essas medidas incluem:
            </p>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2 mt-4">
              <li>Criptografia de dados em trânsito (HTTPS/TLS) e em repouso.</li>
              <li>Controle de acesso baseado em papéis (RBAC) e autenticação multifator.</li>
              <li>Auditorias de segurança regulares e testes de penetração.</li>
              <li>Conformidade com padrões de segurança da indústria (ex.: ISO 27001).</li>
            </ul>
            <p className="text-[#625f55] leading-relaxed mt-4">
              Apesar de nossos esforços, nenhum sistema é completamente seguro. Recomendamos que você use senhas fortes e mantidas confidenciais.
            </p>
          </section>

          {/* 5. Retenção de Dados */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">5. Retenção de Dados</h2>
            <p className="text-[#625f55] leading-relaxed">
              Retemos suas informações pessoais pelo tempo necessário para fornecer o Serviço, cumprir obrigações legais e resolver
              disputas. Você pode solicitar a exclusão de sua conta e dados a qualquer momento, sujeito a obrigações legais de retenção.
            </p>
            <p className="text-[#625f55] leading-relaxed mt-4">
              Após cancelamento de conta, dados não identificáveis podem ser retidos para análise e melhoria de serviço.
            </p>
          </section>

          {/* 6. Seus Direitos */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">6. Seus Direitos</h2>
            <p className="text-[#625f55] leading-relaxed">
              Dependendo de sua localização, você pode ter os seguintes direitos:
            </p>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2 mt-4">
              <li><strong>Direito de Acesso:</strong> Solicitar cópia de seus dados pessoais.</li>
              <li><strong>Direito de Retificação:</strong> Corrigir dados imprecisos ou incompletos.</li>
              <li><strong>Direito de Exclusão:</strong> Solicitar exclusão de seus dados (direito ao esquecimento).</li>
              <li><strong>Direito de Portabilidade:</strong> Receber seus dados em formato estruturado e transferível.</li>
              <li><strong>Direito de Objeção:</strong> Opor-se ao processamento de dados para fins específicos.</li>
              <li><strong>Direito de Revogação de Consentimento:</strong> Retirar consentimento a qualquer momento.</li>
            </ul>
            <p className="text-[#625f55] leading-relaxed mt-4">
              Para exercer esses direitos, entre em contato conosco usando as informações de contato abaixo.
            </p>
          </section>

          {/* 7. Cookies e Rastreamento */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">7. Cookies e Rastreamento</h2>
            <p className="text-[#625f55] leading-relaxed">
              Usamos cookies e tecnologias similares para aprimorar sua experiência, manter sessões autenticadas e coletar dados de uso.
              Você pode controlar cookies através das configurações do seu navegador, embora isso possa afetar o funcionamento do Serviço.
            </p>
            <p className="text-[#625f55] leading-relaxed mt-4">
              Tipos de cookies utilizados:
            </p>
            <ul className="list-disc list-inside text-[#625f55] leading-relaxed space-y-2 mt-2">
              <li><strong>Essenciais:</strong> Necessários para autenticação e funcionamento básico.</li>
              <li><strong>Analíticos:</strong> Ajudam a entender como você usa o Serviço.</li>
              <li><strong>Preferências:</strong> Mantêm suas preferências de interface.</li>
            </ul>
          </section>

          {/* 8. Links Externos */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">8. Links Externos</h2>
            <p className="text-[#625f55] leading-relaxed">
              Nossa plataforma pode conter links para sites de terceiros. Não somos responsáveis pelas práticas de privacidade desses sites.
              Recomendamos que você revise as políticas de privacidade deles antes de fornecer suas informações.
            </p>
          </section>

          {/* 9. Dados de Menores */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">9. Dados de Menores</h2>
            <p className="text-[#625f55] leading-relaxed">
              Nosso Serviço não é direcionado a menores de 18 anos. Não coletamos intencionalmente dados de menores. Se descobrirmos que
              coletamos dados de um menor, os deletaremos imediatamente. Se você é responsável por um menor e tem preocupações,
              entre em contato conosco.
            </p>
          </section>

          {/* 10. Transferência Internacional de Dados */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">10. Transferência Internacional de Dados</h2>
            <p className="text-[#625f55] leading-relaxed">
              Seus dados podem ser armazenados e processados em servidores localizados fora do Brasil. Ao usar o Serviço, você consente
              em transferências internacionais de dados. Implementamos proteções apropriadas, como cláusulas contratuais padrão,
              para garantir proteção adequada.
            </p>
          </section>

          {/* 11. Alterações nesta Política */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">11. Alterações nesta Política</h2>
            <p className="text-[#625f55] leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças materiais via e-mail
              ou avisos destacados no Serviço. Seu uso contínuo do Serviço implica aceitação das alterações.
            </p>
          </section>

          {/* 12. Contato */}
          <section>
            <h2 className="text-2xl font-bold text-[#171713] mb-4">12. Contato</h2>
            <p className="text-[#625f55] leading-relaxed">
              Se você tiver perguntas sobre esta Política de Privacidade ou sobre nossas práticas de privacidade, entre em contato:
            </p>
            <div className="mt-4 p-4 bg-white border border-black/10 rounded-lg">
              <p className="text-[#171713] font-semibold">MOLDURIZE</p>
              <p className="text-[#625f55] text-sm">E-mail: privacy@moldurize.com</p>
              <p className="text-[#625f55] text-sm">Site: www.moldurize.com</p>
            </div>
          </section>
        </article>

        {/* Footer Links */}
        <div className="mt-12 pt-8 border-t border-black/10 flex justify-center gap-6 text-sm">
          <Link href="/" className="text-[#c9952f] hover:text-[#8b651f] font-semibold">
            Voltar ao Início
          </Link>
          <Link href="/terms" className="text-[#c9952f] hover:text-[#8b651f] font-semibold">
            Termos de Serviço
          </Link>
        </div>
      </main>
    </div>
  );
}
