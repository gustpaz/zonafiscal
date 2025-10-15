/**
 * Sistema de Verificação de Permissões Admin
 * Verifica se um usuário tem permissões de administrador
 */

import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/lib/firebase-admin';

const adminDb = getFirestore(adminApp);

// Lista de emails de Super Admins (hardcoded para segurança)
export const SUPER_ADMIN_EMAILS = [
  'gustpaz@gmail.com',
  'admin@zonafiscal.com',
  'luxosegcontato@gmail.com',
];

export interface AdminPermissions {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  permissions: string[];
  role?: string;
}

/**
 * Verifica se um usuário é Super Admin
 */
export function isSuperAdmin(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Obtém as permissões de um usuário
 */
export async function getUserPermissions(userId: string): Promise<AdminPermissions> {
  try {
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return {
        isSuperAdmin: false,
        isAdmin: false,
        permissions: [],
      };
    }

    const userData = userSnap.data();
    const email = userData?.email || '';

    // Verificar se é Super Admin
    const isSA = isSuperAdmin(email);

    // Verificar se tem role de admin
    const hasAdminRole = userData?.adminRole === 'Super Admin' || 
                         userData?.adminRole === 'Admin';

    // Verificar permissões específicas
    const permissions = userData?.adminPermissions || [];

    return {
      isSuperAdmin: isSA,
      isAdmin: isSA || hasAdminRole,
      permissions: isSA ? ['all'] : permissions,
      role: userData?.adminRole,
    };
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return {
      isSuperAdmin: false,
      isAdmin: false,
      permissions: [],
    };
  }
}

/**
 * Verifica se um usuário tem uma permissão específica
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);

  // Super Admins têm todas as permissões
  if (userPermissions.isSuperAdmin) {
    return true;
  }

  // Verificar se tem a permissão específica
  return userPermissions.permissions.includes(permission) ||
         userPermissions.permissions.includes('all');
}

/**
 * Middleware para verificar permissões admin em rotas
 */
export async function requireAdmin(userId: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.isAdmin;
}

/**
 * Middleware para verificar permissão específica
 */
export async function requirePermission(
  userId: string,
  permission: string
): Promise<boolean> {
  return await hasPermission(userId, permission);
}

/**
 * Lista de permissões disponíveis
 */
export const PERMISSIONS = {
  // LGPD
  LGPD_VIEW_USERS: 'lgpd:view_users',
  LGPD_VIEW_LOGS: 'lgpd:view_logs',
  LGPD_EXPORT_DATA: 'lgpd:export_data',
  LGPD_REVERT_ANONYMIZATION: 'lgpd:revert_anonymization',
  LGPD_DELETE_PERMANENTLY: 'lgpd:delete_permanently',

  // Usuários
  USERS_VIEW: 'users:view',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',

  // Pagamentos
  PAYMENTS_VIEW: 'payments:view',
  PAYMENTS_REFUND: 'payments:refund',

  // Planos
  PLANS_VIEW: 'plans:view',
  PLANS_EDIT: 'plans:edit',

  // Marketing
  MARKETING_VIEW: 'marketing:view',
  MARKETING_EDIT: 'marketing:edit',

  // Suporte
  SUPPORT_VIEW: 'support:view',
  SUPPORT_REPLY: 'support:reply',
} as const;

