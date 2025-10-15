/**
 * API Route para buscar membros da equipe
 * Usa Firebase Admin SDK para bypass das regras de segurança
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar o usuário atual
    const actorDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!actorDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const actorData = actorDoc.data() as User;
    if (!actorData.companyId) {
      return NextResponse.json({
        success: true,
        members: [actorData]
      });
    }
    
    // Check if the actor has permission to view the team
    const hasPermission = actorData.role === 'Dono' || 
                         actorData.adminRole === 'Super Admin' || 
                         actorData.teamPermissions?.includes('view_dashboard');
    
    if (!hasPermission) {
      // If no permission, just return the user themselves
      return NextResponse.json({
        success: true,
        members: [actorData]
      });
    }
    
    // Buscar todos os usuários da mesma empresa usando Admin SDK
    const snapshot = await adminDb.collection('users')
      .where("companyId", "==", actorData.companyId)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        members: [actorData]
      });
    }
    
    const users = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));

    return NextResponse.json({
      success: true,
      members: users
    });

  } catch (error: any) {
    console.error('Erro ao buscar membros da equipe:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
