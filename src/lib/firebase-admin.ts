/**
 * Firebase Admin SDK para uso no backend (API Routes)
 * Permite operações privilegiadas como verificação de tokens
 */

import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

// Inicializar Firebase Admin SDK apenas uma vez
if (getApps().length === 0) {
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    adminAuth = getAuth(adminApp);
    adminDb = getFirestore(adminApp);
    console.log('✅ Firebase Admin SDK inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin SDK:', error);
    throw error;
  }
} else {
  adminApp = getApps()[0];
  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}

export { adminApp, adminAuth, adminDb };

