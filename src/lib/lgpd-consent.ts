/**
 * Sistema de Gerenciamento de Consentimentos LGPD
 * Gerencia consentimentos de usuários conforme a Lei Geral de Proteção de Dados
 */

import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

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
  consentVersion: string; // Versão da política de privacidade
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
 * Salvar consentimentos do usuário
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
    const consentRef = doc(db, 'user_consents', userId);
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

    await setDoc(consentRef, consentData, { merge: true });

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
 * Obter consentimentos do usuário
 */
export async function getUserConsent(userId: string): Promise<UserConsent | null> {
  try {
    const consentRef = doc(db, 'user_consents', userId);
    const consentSnap = await getDoc(consentRef);

    if (!consentSnap.exists()) {
      return null;
    }

    return consentSnap.data() as UserConsent;
  } catch (error) {
    console.error('Erro ao obter consentimentos:', error);
    return null;
  }
}

/**
 * Verificar se o usuário deu consentimento para um tipo específico
 */
export async function hasConsent(userId: string, type: ConsentType): Promise<boolean> {
  try {
    const consent = await getUserConsent(userId);
    
    // Cookies essenciais são sempre aceitos
    if (type === 'essential') {
      return true;
    }

    if (!consent || !consent.consents[type]) {
      return false;
    }

    return consent.consents[type]!.granted;
  } catch (error) {
    console.error('Erro ao verificar consentimento:', error);
    return false;
  }
}

/**
 * Registrar processamento de dados para auditoria LGPD
 */
export async function logDataProcessing(record: DataProcessingRecord): Promise<void> {
  try {
    const auditRef = doc(collection(db, 'data_processing_audit'));
    await setDoc(auditRef, {
      ...record,
      timestamp: record.timestamp || new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao registrar processamento de dados:', error);
  }
}

/**
 * Exportar todos os dados do usuário (Direito de Portabilidade - Art. 18, V)
 */
export async function exportUserData(userId: string): Promise<any> {
  try {
    const userData: any = {
      exportDate: new Date().toISOString(),
      userId,
      data: {},
    };

    // Dados do usuário
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      userData.data.profile = userSnap.data();
    }

    // Consentimentos
    const consent = await getUserConsent(userId);
    if (consent) {
      userData.data.consents = consent;
    }

    // Transações
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    const transactionsSnap = await getDocs(transactionsQuery);
    userData.data.transactions = transactionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Relatórios
    const reportsQuery = query(
      collection(db, 'reports'),
      where('userId', '==', userId)
    );
    const reportsSnap = await getDocs(reportsQuery);
    userData.data.reports = reportsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Metas
    const goalsQuery = query(
      collection(db, 'goals'),
      where('userId', '==', userId)
    );
    const goalsSnap = await getDocs(goalsQuery);
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
 * Anonimizar dados do usuário (Soft Delete)
 */
export async function anonymizeUserData(userId: string, reason?: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    
    // Anonimizar dados pessoais
    await updateDoc(userRef, {
      name: '[DADOS REMOVIDOS]',
      email: `anonimizado_${userId}@removido.com`,
      cpf: null,
      cnpj: null,
      phone: null,
      address: null,
      photoURL: null,
      anonymized: true,
      anonymizedAt: serverTimestamp(),
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
 * Excluir permanentemente todos os dados do usuário (Hard Delete)
 */
export async function deleteUserDataPermanently(userId: string, reason?: string): Promise<void> {
  try {
    // ATENÇÃO: Esta operação é IRREVERSÍVEL
    
    // Deletar dados do usuário
    const userRef = doc(db, 'users', userId);
    
    // Deletar transações
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', userId)
    );
    const transactionsSnap = await getDocs(transactionsQuery);
    for (const docSnap of transactionsSnap.docs) {
      await docSnap.ref.delete();
    }

    // Deletar relatórios
    const reportsQuery = query(
      collection(db, 'reports'),
      where('userId', '==', userId)
    );
    const reportsSnap = await getDocs(reportsQuery);
    for (const docSnap of reportsSnap.docs) {
      await docSnap.ref.delete();
    }

    // Deletar metas
    const goalsQuery = query(
      collection(db, 'goals'),
      where('userId', '==', userId)
    );
    const goalsSnap = await getDocs(goalsQuery);
    for (const docSnap of goalsSnap.docs) {
      await docSnap.ref.delete();
    }

    // Deletar consentimentos
    const consentRef = doc(db, 'user_consents', userId);
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
    await userRef.delete();

    console.log(`Todos os dados do usuário ${userId} foram excluídos permanentemente`);
  } catch (error) {
    console.error('Erro ao excluir dados do usuário:', error);
    throw new Error('Erro ao excluir dados permanentemente');
  }
}

/**
 * Obter histórico de auditoria de um usuário
 */
export async function getUserAuditLog(userId: string): Promise<DataProcessingRecord[]> {
  try {
    const auditQuery = query(
      collection(db, 'data_processing_audit'),
      where('userId', '==', userId)
    );
    const auditSnap = await getDocs(auditQuery);

    return auditSnap.docs.map(doc => doc.data() as DataProcessingRecord);
  } catch (error) {
    console.error('Erro ao obter log de auditoria:', error);
    return [];
  }
}

