/**
 * API Route para convidar membros da equipe
 * Usa Firebase Admin SDK para bypass das regras de segurança
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { createInviteServer } from '@/lib/invite-tokens-server';
import type { User, Plan } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { ownerId, email } = await request.json();
    
    if (!ownerId || !email) {
      return NextResponse.json(
        { success: false, error: 'OwnerId e email são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar dados do owner
    const ownerDoc = await adminDb.collection('users').doc(ownerId).get();
    if (!ownerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Owner não encontrado' },
        { status: 404 }
      );
    }

    const owner = ownerDoc.data() as User;
    
    if (owner.role !== 'Dono') {
      return NextResponse.json(
        { success: false, error: 'Apenas o dono da conta pode convidar membros' },
        { status: 403 }
      );
    }

    if (!owner.companyId) {
      return NextResponse.json(
        { success: false, error: 'Dono da conta sem ID de empresa' },
        { status: 400 }
      );
    }

    // Buscar plano do owner
    const planDoc = await adminDb.collection('plans')
      .where('name', '==', owner.plan)
      .limit(1)
      .get();

    if (planDoc.empty) {
      return NextResponse.json(
        { success: false, error: 'Plano do usuário não encontrado' },
        { status: 404 }
      );
    }

    const plan = planDoc.docs[0].data() as Plan;
    const includedMembers = plan.features.teamMembersIncluded || 0;

    if (includedMembers === 0) {
      return NextResponse.json(
        { success: false, error: 'Seu plano não permite adicionar membros à equipe' },
        { status: 403 }
      );
    }

    // Buscar membros da equipe atual (excluindo o dono da contagem)
    const teamSnapshot = await adminDb.collection('users')
      .where('companyId', '==', owner.companyId)
      .get();

    const currentMemberCount = teamSnapshot.docs
      .map(d => d.data() as User)
      .filter(member => member.role !== 'Dono').length;
    
    const shouldCharge = currentMemberCount >= includedMembers;

    // Verificar se usuário já existe
    const existingUserSnapshot = await adminDb.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    let existingUser: User | null = null;
    if (!existingUserSnapshot.empty) {
      existingUser = existingUserSnapshot.docs[0].data() as User;
      
      if (existingUser.companyId) {
        return NextResponse.json(
          { success: false, error: 'Usuário já pertence a uma equipe' },
          { status: 400 }
        );
      }
    }

    // Criar convite
    const { inviteLink } = await createInviteServer(
      email,
      owner.companyId,
      ownerId,
      owner.name,
      owner.name, // companyName = nome do dono
      owner.plan
    );

    // Extrair token do link
    const inviteToken = inviteLink.split('token=')[1];

    return NextResponse.json({
      success: true,
      owner,
      shouldCharge,
      inviteLink,
      inviteToken,
      existingUser
    });

  } catch (error: any) {
    console.error('Erro ao convidar membro:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
