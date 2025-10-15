export default function TermosDeUsoPage() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 p-4 py-12">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground">
          Última atualização: {new Date().toLocaleDateString('pt-BR')}
        </p>
        <p className="text-muted-foreground">
          Bem-vindo à <strong>Zona Fiscal</strong>. Ao usar nossa plataforma, você concorda
          com estes Termos de Uso. Leia-os atentamente.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">1. Aceitação dos Termos</h2>
        <p>
          Ao criar uma conta, acessar ou usar os serviços da Zona Fiscal, você concorda em
          estar vinculado a estes Termos de Uso e à nossa Política de Privacidade. Se você
          não concordar, não use nossos serviços.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">2. Descrição dos Serviços</h2>
        <p>
          A Zona Fiscal é uma plataforma SaaS (Software as a Service) para gestão financeira
          que oferece:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Controle de transações financeiras</li>
          <li>Geração de relatórios com IA</li>
          <li>Acompanhamento de metas e orçamentos</li>
          <li>Gerenciamento de equipes</li>
          <li>Análise de dados financeiros</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">3. Cadastro e Conta</h2>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">3.1. Elegibilidade</h3>
          <p>
            Para usar nossos serviços, você deve ter pelo menos 18 anos e capacidade legal
            para contratar.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">3.2. Informações de Cadastro</h3>
          <p>
            Você deve fornecer informações verdadeiras, precisas e completas ao criar sua
            conta. É sua responsabilidade manter essas informações atualizadas.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">3.3. Segurança da Conta</h3>
          <p>
            Você é responsável por manter a confidencialidade de sua senha e por todas as
            atividades realizadas em sua conta. Notifique-nos imediatamente sobre qualquer
            uso não autorizado.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">4. Planos e Pagamentos</h2>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">4.1. Planos Disponíveis</h3>
          <p>
            Oferecemos diferentes planos de assinatura (Gratuito, Pro, Business) com recursos
            e limites distintos. Os detalhes estão disponíveis em nossa página de preços.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">4.2. Pagamento</h3>
          <ul className="ml-6 list-disc space-y-1">
            <li>Os pagamentos são processados através do Stripe</li>
            <li>As cobranças são mensais ou anuais, conforme o plano escolhido</li>
            <li>Você autoriza cobranças automáticas recorrentes</li>
            <li>Todos os valores estão em Reais (BRL)</li>
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">4.3. Reembolsos</h3>
          <p>
            Oferecemos reembolso integral dentro de 7 dias após a primeira cobrança. Após
            esse período, não há reembolso, mas você pode cancelar a qualquer momento.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">4.4. Cancelamento</h3>
          <p>
            Você pode cancelar sua assinatura a qualquer momento. O acesso aos recursos pagos
            permanecerá até o fim do período de cobrança atual. Após o cancelamento, sua
            conta será rebaixada para o plano gratuito.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">5. Uso Aceitável</h2>
        <p>Ao usar nossos serviços, você concorda em NÃO:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Violar leis, regulamentos ou direitos de terceiros</li>
          <li>Usar a plataforma para fins ilegais ou fraudulentos</li>
          <li>Tentar acessar áreas restritas ou dados de outros usuários</li>
          <li>Realizar engenharia reversa ou descompilar o software</li>
          <li>Enviar spam, malware ou conteúdo malicioso</li>
          <li>Sobrecarregar nossos servidores com requisições excessivas</li>
          <li>Criar múltiplas contas para contornar limitações</li>
          <li>Revender ou sublicenciar o acesso à plataforma</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">6. Propriedade Intelectual</h2>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">6.1. Nossa Propriedade</h3>
          <p>
            Todos os direitos, títulos e interesses sobre a plataforma Zona Fiscal (incluindo
            software, design, logos, marcas) são de propriedade exclusiva da Zona Fiscal ou
            de nossos licenciadores.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">6.2. Seus Dados</h3>
          <p>
            Você mantém todos os direitos sobre os dados que você insere na plataforma. Ao
            usar nossos serviços, você nos concede uma licença limitada para processar,
            armazenar e exibir seus dados conforme necessário para fornecer os serviços.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">7. Disponibilidade e Suporte</h2>
        <p>
          Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos
          operação ininterrupta. Podemos realizar manutenções programadas, que serão
          comunicadas com antecedência quando possível.
        </p>
        <p>
          Suporte por email está disponível para todos os planos. Planos pagos têm prioridade
          no atendimento.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">8. Limitação de Responsabilidade</h2>
        <p>
          <strong>IMPORTANTE:</strong> A Zona Fiscal é fornecida "no estado em que se
          encontra". Não garantimos que os serviços sejam livres de erros ou que atendam a
          todas as suas necessidades.
        </p>
        <p className="rounded-lg border bg-yellow-50 p-4 dark:bg-yellow-950">
          Não nos responsabilizamos por:
        </p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Perdas financeiras decorrentes de decisões baseadas em dados da plataforma</li>
          <li>Erros ou imprecisões nos relatórios gerados</li>
          <li>Perda de dados devido a falhas técnicas (embora façamos backups regulares)</li>
          <li>Interrupções de serviço por causas fora de nosso controle</li>
          <li>Danos indiretos, incidentais ou consequenciais</li>
        </ul>
        <p className="mt-2 text-sm">
          Nossa responsabilidade total não excederá o valor pago por você nos últimos 12 meses.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">9. Modificações dos Serviços e Termos</h2>
        <p>
          Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer parte dos
          serviços a qualquer momento. Também podemos atualizar estes Termos de Uso. As
          alterações significativas serão comunicadas por email com pelo menos 30 dias de
          antecedência.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">10. Rescisão</h2>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">10.1. Por Você</h3>
          <p>
            Você pode cancelar sua conta a qualquer momento através das configurações ou
            entrando em contato conosco.
          </p>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">10.2. Por Nós</h3>
          <p>
            Podemos suspender ou encerrar sua conta se você violar estes Termos de Uso,
            realizar atividades fraudulentas ou prejudicar a plataforma.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">11. Lei Aplicável e Foro</h2>
        <p>
          Estes Termos de Uso são regidos pelas leis do Brasil. Quaisquer disputas serão
          resolvidas no foro da comarca de Petrolina - PE, com exclusão de qualquer outro,
          por mais privilegiado que seja.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">12. Contato</h2>
        <p>
          Para questões sobre estes Termos de Uso, entre em contato:
        </p>
        <div className="rounded-lg border bg-muted/50 p-4">
          <p>
            <strong>Zona Fiscal</strong><br />
            Email: suporte@zonafiscal.com.br<br />
            Horário de atendimento: Segunda a Sexta, 9h às 18h (horário de Brasília)
          </p>
        </div>
      </section>

      <div className="mt-12 rounded-lg border-2 border-primary bg-primary/5 p-6">
        <p className="text-sm">
          <strong>📜 Versão dos Termos:</strong> 1.0.0<br />
          <strong>📅 Data de Vigência:</strong> {new Date().toLocaleDateString('pt-BR')}<br />
          <strong>⚖️ Lei Aplicável:</strong> Legislação Brasileira
        </p>
      </div>
    </div>
  );
}

