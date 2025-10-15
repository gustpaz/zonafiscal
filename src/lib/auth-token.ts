/**
 * Utilitários para obter token de autenticação do Firebase
 * Para uso em chamadas de API do frontend
 */

import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

/**
 * Obtém o token de autenticação do usuário atual
 * @returns Token JWT ou null se não estiver autenticado
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    // Obtém o token JWT do Firebase
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('Erro ao obter token de autenticação:', error);
    return null;
  }
}

/**
 * Faz uma requisição autenticada para a API
 * @param url URL da API
 * @param options Opções do fetch
 * @returns Response da requisição
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Usuário não autenticado');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  return fetch(url, {
    ...options,
    headers,
  });
}

