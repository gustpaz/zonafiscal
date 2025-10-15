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

interface TeamInviteEmailProps {
  inviterName: string;
  companyName: string;
  inviteLink: string;
}

export default function TeamInviteEmail({
  inviterName,
  companyName,
  inviteLink,
}: TeamInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} convidou você para colaborar no Zona Fiscal
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://zonafiscal.com.br/logo.png"
            width="48"
            height="48"
            alt="Zona Fiscal"
            style={logo}
          />
          <Heading style={h1}>
            Você foi convidado para colaborar! 🎉
          </Heading>
          <Text style={text}>
            <strong>{inviterName}</strong> convidou você para fazer parte da 
            equipe de <strong>{companyName}</strong> no Zona Fiscal.
          </Text>
          <Text style={text}>
            Como membro da equipe, você terá acesso para colaborar no gerenciamento 
            financeiro, adicionar transações e visualizar relatórios (conforme 
            permissões definidas pelo administrador).
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={inviteLink}>
              Aceitar Convite
            </Button>
          </Section>
          <Text style={linkText}>
            Ou copie e cole este link no navegador:
            <br />
            <Link href={inviteLink} style={link}>
              {inviteLink}
            </Link>
          </Text>
          <Section style={divider} />
          <Text style={footer}>
            Se você não esperava este convite, pode ignorar este email com segurança.
            <br />
            <br />
            <strong>Este convite expira em 7 dias.</strong>
          </Text>
          <Text style={footer}>
            © 2024 Zona Fiscal - Organize suas finanças PF e PJ
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

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
  maxWidth: '560px',
};

const logo = {
  margin: '0 auto',
  marginBottom: '32px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '16px',
};

const buttonContainer = {
  padding: '27px 0 27px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#72A7A7',
  borderRadius: '6px',
  fontWeight: 'bold',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
};

const linkText = {
  color: '#666',
  fontSize: '14px',
  lineHeight: '24px',
  marginTop: '16px',
  textAlign: 'center' as const,
};

const link = {
  color: '#72A7A7',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
};

const divider = {
  borderTop: '1px solid #eaeaea',
  margin: '32px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  marginTop: '12px',
  textAlign: 'center' as const,
};

