"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface IntegrationSettings {
  stripePublishableKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
}

export async function getIntegrationSettingsClient(): Promise<IntegrationSettings> {
  try {
    const settingsRef = doc(db, 'admin', 'integrationSettings');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      return settingsSnap.data() as IntegrationSettings;
    }
    
    // Retorna valores padrão vazios
    return {
      stripePublishableKey: "",
      stripeSecretKey: "",
      stripeWebhookSecret: ""
    };
  } catch (error) {
    console.error("Erro ao buscar configurações de integrações:", error);
    throw error;
  }
}

export async function saveIntegrationSettingsClient(settings: IntegrationSettings): Promise<void> {
  try {
    const settingsRef = doc(db, 'admin', 'integrationSettings');
    await setDoc(settingsRef, settings);
  } catch (error) {
    console.error("Erro ao salvar configurações de integrações:", error);
    throw error;
  }
}

