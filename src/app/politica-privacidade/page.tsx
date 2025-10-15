export default function PoliticaPrivacidadePage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-4 py-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
        <p className="text-muted-foreground">
          Esta Política de Privacidade descreve como a <strong>Zona Fiscal</strong> coleta,
          usa, armazena e protege seus dados pessoais, em conformidade com a <strong>Lei Geral
          de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Responsável pelo Tratamento de Dados</h2>
        <p>
          <strong>Zona Fiscal</strong><br />
          Email: dpo@zonafiscal.com.br<br />
          Encarregado de Dados (DPO): Dr. Ricardo Almeida Santos
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Dados Coletados</h2>
        <p>Coletamos os seguintes tipos de dados pessoais:</p>
        
        <div className="space-y-2 rounded-lg border p-4">
          <h3 className="font-semibold">2.1. Dados de Cadastro</h3>
          <ul className="ml-6 list-disc space-y-1">
            <li>Nome completo</li>
            <li>Endereço de e-mail</li>
            <li>CPF ou CNPJ</li>
            <li>Telefone</li>
            <li>Foto de perfil (opcional)</li>
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <h3 className="font-semibold">2.2. Dados de Uso</h3>
          <ul className="ml-6 list-disc space-y-1">
            <li>Endereço IP</li>
            <li>Informações do navegador e dispositivo</li>
            <li>Páginas visitadas e tempo de navegação</li>
            <li>Ações realizadas na plataforma</li>
          </ul>
        </div>

        <div className="space-y-2 rounded-lg border p-4">
          <h3 className="font-semibold">2.3. Dados Financeiros</h3>
          <ul className="ml-6 list-disc space-y-1">
            <li>Transações financeiras cadastradas</li>
            <li>Informações de pagamento (processadas por terceiros seguros)</li>
            <li>Histórico de assinaturas</li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Finalidade do Tratamento</h2>
        <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>Execução do contrato:</strong> Fornecer os serviços da plataforma</li>
          <li><strong>Suporte ao cliente:</strong> Responder dúvidas e solicitações</li>
          <li><strong>Melhoria dos serviços:</strong> Análise de uso e desenvolvimento de funcionalidades</li>
          <li><strong>Marketing:</strong> Envio de newsletters e ofertas (com seu consentimento)</li>
          <li><strong>Cumprimento legal:</strong> Atender obrigações fiscais e regulatórias</li>
          <li><strong>Segurança:</strong> Prevenir fraudes e proteger a plataforma</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Base Legal para o Tratamento</h2>
        <p>O tratamento dos seus dados pessoais é fundamentado em:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>Consentimento:</strong> Para marketing, análise e personalização</li>
          <li><strong>Execução de contrato:</strong> Para fornecimento dos serviços</li>
          <li><strong>Obrigação legal:</strong> Para cumprimento de obrigações fiscais</li>
          <li><strong>Legítimo interesse:</strong> Para segurança e melhoria dos serviços</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Compartilhamento de Dados</h2>
        <p>Podemos compartilhar seus dados com:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>Processadores de pagamento:</strong> Stripe (para processar pagamentos)</li>
          <li><strong>Ferramentas de análise:</strong> Google Analytics (para análise de uso)</li>
          <li><strong>Serviços de email:</strong> Resend (para envio de emails transacionais)</li>
          <li><strong>Armazenamento:</strong> Firebase/Google Cloud (para armazenamento de dados)</li>
          <li><strong>Notificações:</strong> Slack (para notificações internas)</li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">
          Todos os parceiros são selecionados com base em rigorosos critérios de segurança e
          conformidade com a LGPD.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6. Armazenamento e Segurança</h2>
        <p>Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>Criptografia de dados em trânsito (SSL/TLS) e em repouso</li>
          <li>Controles de acesso rigorosos</li>
          <li>Monitoramento contínuo de segurança</li>
          <li>Auditorias regulares de segurança</li>
          <li>Backup regular de dados</li>
        </ul>
        <p className="mt-2">
          <strong>Prazo de armazenamento:</strong> Seus dados serão mantidos enquanto sua
          conta estiver ativa ou conforme necessário para cumprir obrigações legais (geralmente
          5 anos para dados fiscais).
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">7. Seus Direitos (Art. 18 da LGPD)</h2>
        <p>Você tem os seguintes direitos em relação aos seus dados pessoais:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li><strong>Confirmação e acesso:</strong> Saber se tratamos seus dados e acessá-los</li>
          <li><strong>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
          <li><strong>Anonimização ou bloqueio:</strong> Anonimizar ou bloquear dados desnecessários</li>
          <li><strong>Eliminação:</strong> Excluir dados tratados com seu consentimento</li>
          <li><strong>Portabilidade:</strong> Exportar seus dados em formato estruturado</li>
          <li><strong>Revogação do consentimento:</strong> Retirar consentimento a qualquer momento</li>
          <li><strong>Informação sobre compartilhamento:</strong> Saber com quem compartilhamos seus dados</li>
          <li><strong>Oposição:</strong> Se opor ao tratamento em determinadas situações</li>
        </ul>
        <p className="mt-4">
          Para exercer seus direitos, acesse a página de{' '}
          <a href="/privacidade" className="font-semibold underline">
            Configurações de Privacidade
          </a>{' '}
          ou entre em contato com nosso DPO através do email dpo@zonafiscal.com.br.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">8. Cookies</h2>
        <p>
          Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência. Você pode
          gerenciar suas preferências de cookies a qualquer momento através do{' '}
          <a href="/privacidade" className="font-semibold underline">
            banner de cookies
          </a>{' '}
          ou das configurações do seu navegador.
        </p>
        <p className="text-sm text-muted-foreground">
          Consulte nossa seção de cookies para mais informações sobre os tipos de cookies que
          utilizamos.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">9. Alterações nesta Política</h2>
        <p>
          Podemos atualizar esta Política de Privacidade periodicamente. A versão mais recente
          estará sempre disponível nesta página, com a data da última atualização no topo.
          Alterações significativas serão comunicadas por email.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">10. Contato</h2>
        <p>
          Para questões sobre privacidade e proteção de dados, entre em contato:
        </p>
        <div className="rounded-lg border bg-muted/50 p-4">
          <p>
            <strong>Encarregado de Dados (DPO)</strong><br />
            Email: dpo@zonafiscal.com.br<br />
            Responderemos em até 15 dias úteis.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">11. Autoridade Nacional de Proteção de Dados (ANPD)</h2>
        <p>
          Se você acredita que seus direitos não foram respeitados, pode registrar uma
          reclamação junto à Autoridade Nacional de Proteção de Dados (ANPD):
        </p>
        <div className="rounded-lg border bg-muted/50 p-4">
          <p>
            Website: <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="underline">www.gov.br/anpd</a><br />
            Email: atendimento@anpd.gov.br
          </p>
        </div>
      </section>

      <div className="mt-12 rounded-lg border-2 border-primary bg-primary/5 p-6">
        <p className="text-sm">
          <strong>📜 Versão da Política:</strong> 1.0.0<br />
          <strong>📅 Data de Vigência:</strong> {new Date().toLocaleDateString('pt-BR')}<br />
          <strong>⚖️ Base Legal:</strong> Lei nº 13.709/2018 (LGPD)
        </p>
      </div>
    </div>
  );
}

