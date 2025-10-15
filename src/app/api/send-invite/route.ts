/**
 * API Route para enviar convites por email
 * Usa Firebase Admin SDK para bypass das regras de segurança
 * Integra com Resend para envio de emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { Resend } from 'resend';
import TeamInviteEmail from '@/emails/team-invite';
import type { User } from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, role = 'member' } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar convite pendente para este email
    const inviteSnapshot = await adminDb!.collection('invites')
      .where('email', '==', email)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (inviteSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Nenhum convite pendente encontrado para este email' },
        { status: 404 }
      );
    }

    const inviteDoc = inviteSnapshot.docs[0];
    const invite = inviteDoc.data();

    // Enviar email usando Resend (versão simples)
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${invite.token}`;
    
    const { data, error } = await resend.emails.send({
      from: 'Zona Fiscal <noreply@zonafiscal.com.br>',
      to: [email],
      subject: `🎯 Convite para participar da equipe ${invite.companyName}`,
      react: TeamInviteEmail({ 
        inviterName: invite.inviterName, 
        companyName: invite.companyName, 
        inviteLink: inviteLink 
      }),
    });

    if (error) {
      console.error('Erro ao enviar email via Resend:', error);
      return NextResponse.json(
        { success: false, error: 'Erro ao enviar email' },
        { status: 500 }
      );
    }

    console.log('📧 Email enviado com sucesso via Resend:', data);

    // Atualizar status do convite para "sent"
    await adminDb!.collection('invites').doc(inviteDoc.id).update({
      status: 'sent',
      sentAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Convite enviado com sucesso',
      inviteId: inviteDoc.id
    });

  } catch (error: any) {
    console.error('Erro ao enviar convite por email:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
