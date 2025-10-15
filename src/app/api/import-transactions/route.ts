import { NextRequest } from 'next/server';
import { createSuccessResponse, createErrorResponse, logSecurityEvent } from '@/lib/api-validation';
import { adminAuth } from '@/lib/firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';

const adminDb = getFirestore(adminApp);

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      logSecurityEvent('Unauthorized import attempt - no token', {}, req);
      return createErrorResponse('Não autorizado', 401);
    }

    const token = authHeader.split('Bearer ')[1];
    let userId: string;

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      logSecurityEvent('Unauthorized import attempt - invalid token', {}, req);
      return createErrorResponse('Não autorizado', 401);
    }

    // Verificar se o usuário tem acesso à importação CSV
    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return createErrorResponse('Usuário não encontrado', 404);
    }

    const userData = userDoc.data();
    const userPlan = userData?.plan || 'Gratuito';

    // Buscar configurações do plano
    const plansSnapshot = await adminDb
      .collection('plans')
      .where('name', '==', userPlan)
      .where('status', '==', 'Ativo')
      .limit(1)
      .get();

    if (!plansSnapshot.empty) {
      const planData = plansSnapshot.docs[0].data();
      const canImport = planData.features?.csvImport ?? false;

      if (!canImport) {
        logSecurityEvent('Import attempt without permission', { userId, plan: userPlan }, req);
        return createErrorResponse('Esta funcionalidade não está disponível no seu plano. Faça upgrade para importar transações.', 403);
      }
    } else {
      // Se não encontrou o plano, assumir que é Gratuito e bloquear
      if (userPlan === 'Gratuito') {
        logSecurityEvent('Import attempt on free plan', { userId }, req);
        return createErrorResponse('Esta funcionalidade não está disponível no plano Gratuito. Faça upgrade para importar transações.', 403);
      }
    }

    const { transactions } = await req.json();

    if (!transactions || !Array.isArray(transactions)) {
      return createErrorResponse('Transações inválidas', 400);
    }

    const transactionIds: string[] = [];
    const batch = adminDb.batch();

    // Criar todas as transações em lote usando Admin SDK (bypassa regras)
    const importedAt = new Date().toISOString();
    
    for (const t of transactions) {
      const transactionRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .doc();

      const transactionDate = new Date(t.date);
      const dateString = transactionDate.toISOString().split('T')[0]; // YYYY-MM-DD para query

      const dataToSave = {
        ...t,
        userId,
        date: Timestamp.fromDate(transactionDate),
        dateString: dateString, // Campo adicional para queries rápidas
        isImported: true, // Marca como importada
        importedAt: importedAt, // Data da importação
      };

      batch.set(transactionRef, dataToSave);
      transactionIds.push(transactionRef.id);
    }

    // Commit do batch
    await batch.commit();

    // Criar log de auditoria para a importação
    if (transactionIds.length > 0) {
      const auditLogRef = adminDb
        .collection('users')
        .doc(userId)
        .collection('auditLogs')
        .doc();

      await auditLogRef.set({
        date: importedAt,
        userId: userId,
        userName: 'Sistema',
        action: 'create',
        entity: 'transaction',
        entityId: 'batch_import',
        details: `Importadas ${transactionIds.length} transações via arquivo CSV.`,
        previousHash: '',
        hash: '',
      });
    }

    return createSuccessResponse({
      success: true,
      count: transactionIds.length,
      transactionIds,
    });
  } catch (error: any) {
    console.error('❌ Erro na API de importação:', error);
    logSecurityEvent('Import API error', { error: error.message }, req);
    return createErrorResponse('Erro ao importar transações', 500);
  }
}

