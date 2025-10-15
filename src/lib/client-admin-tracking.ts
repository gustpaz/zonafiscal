"use client";

import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface TrackingSettings {
  metaPixelId: string;
  googleAnalyticsId: string;
}

export async function getTrackingSettingsClient(): Promise<TrackingSettings> {
  try {
    const settingsRef = doc(db, 'admin', 'trackingSettings');
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      return settingsSnap.data() as TrackingSettings;
    }
    
    // Retorna valores padrão vazios
    return {
      metaPixelId: "",
      googleAnalyticsId: ""
    };
  } catch (error) {
    console.error("Erro ao buscar configurações de tracking:", error);
    throw error;
  }
}

export async function saveTrackingSettingsClient(settings: TrackingSettings): Promise<void> {
  try {
    const settingsRef = doc(db, 'admin', 'trackingSettings');
    await setDoc(settingsRef, settings);
  } catch (error) {
    console.error("Erro ao salvar configurações de tracking:", error);
    throw error;
  }
}

