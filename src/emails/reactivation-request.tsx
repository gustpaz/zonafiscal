import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface ReactivationRequestEmailProps {
  userName?: string;
  reactivationLink: string;
}

export const ReactivationRequestEmail = ({
  userName = 'Usuário',
  reactivationLink,
}: ReactivationRequestEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Solicitação de Reativação de Conta - Zona Fiscal</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔄 Solicitação de Reativação</Heading>
          
          <Text style={text}>Olá {userName},</Text>
          
          <Text style={text}>
            Recebemos uma solicitação de <strong>reversão de anonimização</strong> da sua conta
            no Zona Fiscal.
          </Text>

          <Text style={text}>
            Anteriormente, você solicitou a anonimização dos seus dados pessoais. Agora, para
            reativar sua conta, precisamos que você forneça seus dados novamente.
          </Text>

          <Section style={highlightBox}>
            <Text style={highlightText}>
              ⚠️ <strong>Importante:</strong> Esta solicitação foi iniciada pela nossa equipe.
              Se você não solicitou a reativação, ignore este email.
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={reactivationLink}>
              Reativar Minha Conta
            </Button>
          </Section>

          <Text style={text}>
            Ou copie e cole este link no seu navegador:
          </Text>
          <Link href={reactivationLink} style={link}>
            {reactivationLink}
          </Link>

          <Text style={text}>
            Ao clicar no link acima, você será direcionado para um formulário onde deverá
            fornecer novamente seus dados pessoais (nome, email, CPF, etc.).
          </Text>

          <Section style={footerBox}>
            <Text style={footerText}>
              <strong>Seus Direitos (LGPD)</strong>
            </Text>
            <Text style={footerText}>
              Você tem total controle sobre seus dados pessoais. Para mais informações sobre
              como tratamos seus dados, consulte nossa{' '}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/politica-privacidade`}>
                Política de Privacidade
              </Link>.
            </Text>
            <Text style={footerText}>
              Dúvidas? Entre em contato: dpo@zonafiscal.com.br
            </Text>
          </Section>

          <Text style={footer}>
            © {new Date().getFullYear()} Zona Fiscal. Todos os direitos reservados.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ReactivationRequestEmail;

// Estilos
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
};

const highlightBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  margin: '20px 40px',
  padding: '12px 16px',
  borderRadius: '4px',
};

const highlightText = {
  color: '#856404',
  fontSize: '14px',
  lineHeight: '22px',
  margin: 0,
};

const buttonContainer = {
  padding: '27px 40px',
};

const button = {
  backgroundColor: '#72A7A7',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '100%',
  padding: '12px',
};

const link = {
  color: '#72A7A7',
  fontSize: '14px',
  textDecoration: 'underline',
  padding: '0 40px',
  wordBreak: 'break-all' as const,
};

const footerBox = {
  backgroundColor: '#f8f9fa',
  margin: '32px 40px',
  padding: '16px',
  borderRadius: '4px',
};

const footerText = {
  color: '#666',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '8px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
};

