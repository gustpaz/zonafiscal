/**
 * Sistema de Gerenciamento de Consentimentos LGPD - Admin SDK
 * Para uso em API Routes (servidor) - bypassa regras de segurança do Firestore
 */

import { adminApp } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const adminDb = getFirestore(adminApp);

export type ConsentType = 
  | 'essential'           // Cookies essenciais (sempre aceito)
  | 'analytics'           // Google Analytics, métricas
  | 'marketing'           // Pixels de conversão, remarketing
  | 'personalization'     // Personalização de conteúdo
  | 'data_processing'     // Processamento de dados pessoais
  | 'data_sharing';       // Compartilhamento com terceiros

export interface UserConsent {
  userId: string;
  consents: {
    [key in ConsentType]?: {
      granted: boolean;
      timestamp: string;
      ipAddress?: string;
      userAgent?: string;
    };
  };
  lastUpdated: string;
  consentVersion: string;
}

export interface DataProcessingRecord {
  userId: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'anonymize';
  dataType: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'legitimate_interest';
}

const CURRENT_POLICY_VERSION = '1.0.0';

/**
 * Salvar consentimentos do usuário (Admin SDK)
 */
export async function saveUserConsent(
  userId: string,
  consents: Partial<Record<ConsentType, boolean>>,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  try {
    const consentRef = adminDb.collection('user_consents').doc(userId);
    const timestamp = new Date().toISOString();

    const consentData: Partial<UserConsent> = {
      userId,
      consents: {},
      lastUpdated: timestamp,
      consentVersion: CURRENT_POLICY_VERSION,
    };

    // Formatar consentimentos
    for (const [type, granted] of Object.entries(consents)) {
      consentData.consents![type as ConsentType] = {
        granted: granted as boolean,
        timestamp,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      };
    }

    await consentRef.set(consentData, { merge: true });

    // Registrar ação de auditoria
    await logDataProcessing({
      userId,
      action: 'update',
      dataType: 'user_consent',
      timestamp,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      purpose: 'Atualização de consentimentos LGPD',
      legalBasis: 'consent',
    });
  } catch (error) {
    console.error('Erro ao salvar consentimentos:', error);
    throw new Error('Erro ao salvar consentimentos');
  }
}

/**
 * Obter consentimentos do usuário (Admin SDK)
 */
export async function getUserConsent(userId: string): Promise<UserConsent | null> {
  try {
    const consentRef = adminDb.collection('user_consents').doc(userId);
    const consentSnap = await consentRef.get();

    if (!consentSnap.exists) {
      return null;
    }

    return consentSnap.data() as UserConsent;
  } catch (error) {
    console.error('Erro ao obter consentimentos:', error);
    return null;
  }
}

/**
 * Registrar processamento de dados para auditoria LGPD (Admin SDK)
 */
export async function logDataProcessing(record: DataProcessingRecord): Promise<void> {
  try {
    const auditRef = adminDb.collection('data_processing_audit').doc();
    await auditRef.set({
      ...record,
      timestamp: record.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao registrar processamento de dados:', error);
  }
}

/**
 * Exportar todos os dados do usuário (Admin SDK)
 */
export async function exportUserData(userId: string): Promise<any> {
  try {
    const userData: any = {
      exportDate: new Date().toISOString(),
      userId,
      data: {},
    };

    // Dados do usuário
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      userData.data.profile = userSnap.data();
    }

    // Consentimentos
    const consent = await getUserConsent(userId);
    if (consent) {
      userData.data.consents = consent;
    }

    // Transações
    const transactionsSnap = await adminDb
      .collection('transactions')
      .where('userId', '==', userId)
      .get();
    userData.data.transactions = transactionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Relatórios
    const reportsSnap = await adminDb
      .collection('reports')
      .where('userId', '==', userId)
      .get();
    userData.data.reports = reportsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Metas
    const goalsSnap = await adminDb
      .collection('goals')
      .where('userId', '==', userId)
      .get();
    userData.data.goals = goalsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Registrar ação de auditoria
    await logDataProcessing({
      userId,
      action: 'export',
      dataType: 'all_user_data',
      timestamp: new Date().toISOString(),
      purpose: 'Exercício do direito de portabilidade (LGPD Art. 18, V)',
      legalBasis: 'legal_obligation',
    });

    return userData;
  } catch (error) {
    console.error('Erro ao exportar dados do usuário:', error);
    throw new Error('Erro ao exportar dados');
  }
}

/**
 * Anonimizar dados do usuário (Admin SDK)
 */
export async function anonymizeUserData(userId: string, reason?: string): Promise<void> {
  try {
    const userRef = adminDb.collection('users').doc(userId);
    
    // Anonimizar dados pessoais
    await userRef.update({
      name: '[DADOS REMOVIDOS]',
      email: `anonimizado_${userId}@removido.com`,
      cpf: null,
      cnpj: null,
      phone: null,
      address: null,
      photoURL: null,
      anonymized: true,
      anonymizedAt: new Date().toISOString(),
      anonymizationReason: reason || 'Solicitação do usuário',
    });

    // Registrar ação de auditoria
    await logDataProcessing({
      userId,
      action: 'anonymize',
      dataType: 'user_profile',
      timestamp: new Date().toISOString(),
      purpose: 'Exercício do direito ao esquecimento (LGPD Art. 18, VI)',
      legalBasis: 'legal_obligation',
    });

    console.log(`Dados do usuário ${userId} anonimizados com sucesso`);
  } catch (error) {
    console.error('Erro ao anonimizar dados do usuário:', error);
    throw new Error('Erro ao anonimizar dados');
  }
}

/**
 * Excluir permanentemente todos os dados do usuário (Admin SDK)
 */
export async function deleteUserDataPermanently(userId: string, reason?: string): Promise<void> {
  try {
    // ATENÇÃO: Esta operação é IRREVERSÍVEL
    
    // Deletar transações
    const transactionsSnap = await adminDb
      .collection('transactions')
      .where('userId', '==', userId)
      .get();
    
    const batch1 = adminDb.batch();
    transactionsSnap.docs.forEach(doc => {
      batch1.delete(doc.ref);
    });
    await batch1.commit();

    // Deletar relatórios
    const reportsSnap = await adminDb
      .collection('reports')
      .where('userId', '==', userId)
      .get();
    
    const batch2 = adminDb.batch();
    reportsSnap.docs.forEach(doc => {
      batch2.delete(doc.ref);
    });
    await batch2.commit();

    // Deletar metas
    const goalsSnap = await adminDb
      .collection('goals')
      .where('userId', '==', userId)
      .get();
    
    const batch3 = adminDb.batch();
    goalsSnap.docs.forEach(doc => {
      batch3.delete(doc.ref);
    });
    await batch3.commit();

    // Deletar consentimentos
    const consentRef = adminDb.collection('user_consents').doc(userId);
    await consentRef.delete();

    // Registrar ação de auditoria ANTES de deletar o usuário
    await logDataProcessing({
      userId,
      action: 'delete',
      dataType: 'all_user_data',
      timestamp: new Date().toISOString(),
      purpose: reason || 'Exercício do direito à exclusão (LGPD Art. 18, VI)',
      legalBasis: 'legal_obligation',
    });

    // Deletar usuário por último
    const userRef = adminDb.collection('users').doc(userId);
    await userRef.delete();

    console.log(`Todos os dados do usuário ${userId} foram excluídos permanentemente`);
  } catch (error) {
    console.error('Erro ao excluir dados do usuário:', error);
    throw new Error('Erro ao excluir dados permanentemente');
  }
}

