/**
 * Helper para autenticação e autorização em rotas admin
 */

import { NextRequest } from 'next/server';
import { createErrorResponse } from '@/lib/api-validation';
import { adminAuth } from '@/lib/firebase-admin';
import { requirePermission } from '@/lib/admin-permissions';

export interface AuthResult {
  success: boolean;
  userId?: string;
  error?: Response;
}

/**
 * Verifica autenticação e permissões admin em uma rota
 */
export async function verifyAdminAuth(
  req: NextRequest,
  requiredPermission?: string
): Promise<AuthResult> {
  // Verificar header de autorização
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      success: false,
      error: createErrorResponse('Não autorizado - token ausente', 401),
    };
  }

  // Extrair e verificar token
  const token = authHeader.split('Bearer ')[1];
  let decodedToken;

  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (error) {
    return {
      success: false,
      error: createErrorResponse('Não autorizado - token inválido', 401),
    };
  }

  // Verificar permissão específica (se fornecida)
  if (requiredPermission) {
    const hasAccess = await requirePermission(decodedToken.uid, requiredPermission);
    if (!hasAccess) {
      return {
        success: false,
        error: createErrorResponse('Acesso negado - permissões insuficientes', 403),
      };
    }
  }

  return {
    success: true,
    userId: decodedToken.uid,
  };
}

