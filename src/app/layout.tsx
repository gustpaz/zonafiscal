import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { AppContent } from '@/components/app-content';
import { FacebookPixel } from '@/components/facebook-pixel';
import { Suspense } from 'react';
import FirebaseErrorListener from '@/components/FirebaseErrorListener';
import { CookieBanner } from '@/components/lgpd/cookie-banner';

export const metadata: Metadata = {
  title: 'Zona Fiscal | Controle Financeiro para Autônomos e Freelancers',
  description: 'Organize suas finanças de uma vez por todas. O Zona Fiscal é o app de controle financeiro feito para autônomos, freelancers e MEIs que misturam contas PF e PJ. Tenha clareza do seu lucro real e pare de usar planilhas.',
  keywords: "controle financeiro para autônomos, finanças para freelancers, separar contas pf e pj, aplicativo financeiro para mei, lucro real autônomo, gestão financeira para pequenos negócios, app de finanças para profissional liberal",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Zona Fiscal',
  },
};

export const viewport: Viewport = {
  themeColor: '#72A7A7',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <FirebaseErrorListener />
          <AppContent>
            {children}
          </AppContent>
        </AuthProvider>
        <Toaster />
        <Suspense fallback={null}>
            <FacebookPixel />
        </Suspense>
        <CookieBanner />
      </body>
    </html>
  );
}
