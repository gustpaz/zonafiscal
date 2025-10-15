import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface LGPDDeadlineReminderEmailProps {
  requestType: string;
  daysRemaining: number;
  requestDate: string;
  userName?: string;
}

export const LGPDDeadlineReminderEmail = ({
  requestType = 'Solicitação LGPD',
  daysRemaining = 3,
  requestDate,
  userName = 'Administrador',
}: LGPDDeadlineReminderEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>⚠️ Prazo LGPD: {daysRemaining} dias restantes - {requestType}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>⚠️ Lembrete de Prazo LGPD</Heading>
          
          <Text style={text}>Olá {userName},</Text>
          
          <Text style={text}>
            Este é um lembrete automático sobre uma solicitação pendente de LGPD que está
            próxima do prazo legal de 15 dias.
          </Text>

          <Section style={alertBox}>
            <Text style={alertText}>
              <strong>⏰ Atenção:</strong> Restam apenas <strong>{daysRemaining} dias</strong> para
              responder a esta solicitação!
            </Text>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>📋 Detalhes da Solicitação:</Text>
            <Text style={infoText}>
              <strong>Tipo:</strong> {requestType}<br />
              <strong>Data da Solicitação:</strong> {new Date(requestDate).toLocaleDateString('pt-BR')}<br />
              <strong>Prazo Legal:</strong> 15 dias úteis (LGPD Art. 18)<br />
              <strong>Status:</strong> Pendente
            </Text>
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/lgpd`}>
              Acessar Painel LGPD
            </Button>
          </Section>

          <Text style={text}>
            <strong>Por que este prazo é importante?</strong>
          </Text>
          <Text style={text}>
            De acordo com o <strong>Art. 18 da LGPD</strong>, o controlador deve fornecer,
            de forma imediata, em formato simplificado, ou, no prazo de 15 dias, em formato
            completo, as informações solicitadas pelo titular.
          </Text>

          <Text style={text}>
            <strong>O não cumprimento pode resultar em:</strong>
          </Text>
          <ul style={list}>
            <li>Multa de até 2% do faturamento (limitado a R$ 50 milhões)</li>
            <li>Advertência com indicação de prazo</li>
            <li>Publicização da infração</li>
            <li>Bloqueio ou eliminação dos dados</li>
            <li>Suspensão parcial do funcionamento do banco de dados</li>
          </ul>

          <Section style={footerBox}>
            <Text style={footerText}>
              <strong>Precisa de ajuda?</strong><br />
              Entre em contato com o DPO: dpo@zonafiscal.com.br
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

export default LGPDDeadlineReminderEmail;

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

const alertBox = {
  backgroundColor: '#fff3cd',
  borderLeft: '4px solid #ffc107',
  margin: '20px 40px',
  padding: '12px 16px',
  borderRadius: '4px',
};

const alertText = {
  color: '#856404',
  fontSize: '16px',
  lineHeight: '24px',
  margin: 0,
};

const infoBox = {
  backgroundColor: '#f8f9fa',
  margin: '20px 40px',
  padding: '16px',
  borderRadius: '4px',
  border: '1px solid #dee2e6',
};

const infoTitle = {
  color: '#333',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const infoText = {
  color: '#666',
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

const list = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '24px',
  paddingLeft: '60px',
  margin: '16px 0',
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

