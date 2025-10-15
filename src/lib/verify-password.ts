/**
 * Sistema de Verificação de Senha
 * Verifica a senha do usuário antes de ações críticas (exclusão de conta, etc)
 */

import { getAuth, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { app } from '@/lib/firebase';

/**
 * Verifica se a senha fornecida está correta para o usuário atual
 * Usa re-autenticação do Firebase para validar
 * 
 * @param password - Senha a ser verificada
 * @returns true se a senha estiver correta, false caso contrário
 */
export async function verifyCurrentUserPassword(password: string): Promise<boolean> {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user || !user.email) {
      console.error('Usuário não autenticado ou sem email');
      return false;
    }

    // Criar credencial com email e senha
    const credential = EmailAuthProvider.credential(user.email, password);

    // Tentar re-autenticar com a senha fornecida
    try {
      await reauthenticateWithCredential(user, credential);
      return true; // Senha correta
    } catch (error: any) {
      console.error('Erro ao verificar senha:', error.code);
      
      // Códigos de erro específicos
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        return false; // Senha incorreta
      }
      
      // Outros erros (usuário não existe, muitas tentativas, etc)
      return false;
    }
  } catch (error) {
    console.error('Erro geral ao verificar senha:', error);
    return false;
  }
}

/**
 * Verifica se a senha está correta E retorna mensagem de erro amigável
 * 
 * @param password - Senha a ser verificada
 * @returns objeto com resultado e mensagem de erro se houver
 */
export async function verifyPasswordWithError(
  password: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!password || password.trim().length === 0) {
      return {
        valid: false,
        error: 'A senha é obrigatória para confirmar esta ação.',
      };
    }

    if (password.length < 6) {
      return {
        valid: false,
        error: 'Senha muito curta.',
      };
    }

    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user || !user.email) {
      return {
        valid: false,
        error: 'Usuário não autenticado.',
      };
    }

    const credential = EmailAuthProvider.credential(user.email, password);

    try {
      await reauthenticateWithCredential(user, credential);
      return { valid: true };
    } catch (error: any) {
      console.error('Erro ao verificar senha:', error.code);

      switch (error.code) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          return {
            valid: false,
            error: 'Senha incorreta. Por favor, tente novamente.',
          };
        
        case 'auth/too-many-requests':
          return {
            valid: false,
            error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
          };
        
        case 'auth/user-not-found':
          return {
            valid: false,
            error: 'Usuário não encontrado.',
          };
        
        default:
          return {
            valid: false,
            error: 'Erro ao verificar senha. Tente novamente.',
          };
      }
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Erro ao verificar senha. Tente novamente.',
    };
  }
}

/**
 * Verifica senha com rate limiting (máximo 5 tentativas em 15 minutos)
 * Previne ataques de força bruta
 */
const passwordAttempts = new Map<string, { count: number; resetAt: number }>();

export async function verifyPasswordWithRateLimit(
  userId: string,
  password: string
): Promise<{ valid: boolean; error?: string; attemptsRemaining?: number }> {
  const now = Date.now();
  const userAttempts = passwordAttempts.get(userId);

  // Verificar se há tentativas anteriores
  if (userAttempts) {
    // Resetar se já passou o tempo
    if (now > userAttempts.resetAt) {
      passwordAttempts.delete(userId);
    } else if (userAttempts.count >= 5) {
      const minutesRemaining = Math.ceil((userAttempts.resetAt - now) / 60000);
      return {
        valid: false,
        error: `Muitas tentativas incorretas. Aguarde ${minutesRemaining} minutos.`,
        attemptsRemaining: 0,
      };
    }
  }

  // Verificar senha
  const result = await verifyPasswordWithError(password);

  // Atualizar contador de tentativas se senha incorreta
  if (!result.valid) {
    const current = passwordAttempts.get(userId) || { 
      count: 0, 
      resetAt: now + 15 * 60 * 1000 // 15 minutos
    };
    
    passwordAttempts.set(userId, {
      count: current.count + 1,
      resetAt: current.resetAt,
    });

    return {
      ...result,
      attemptsRemaining: 5 - (current.count + 1),
    };
  }

  // Senha correta - limpar tentativas
  passwordAttempts.delete(userId);

  return { valid: true };
}

