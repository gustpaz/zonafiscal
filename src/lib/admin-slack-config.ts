// src/lib/admin-slack-config.ts
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface SlackConfig {
  botToken: string;
  channelId: string;
  enabled: boolean;
  updatedAt: string;
}

const SLACK_CONFIG_DOC = 'slack_config';

export async function getSlackConfig(): Promise<SlackConfig | null> {
  try {
    const configRef = doc(db, 'admin_settings', SLACK_CONFIG_DOC);
    const configSnap = await getDoc(configRef);
    
    if (configSnap.exists()) {
      return configSnap.data() as SlackConfig;
    }
    
    return null;
  } catch (error) {
    console.error("Erro ao buscar configuração do Slack:", error);
    return null;
  }
}

export async function saveSlackConfig(config: Omit<SlackConfig, 'updatedAt'>): Promise<boolean> {
  try {
    const configRef = doc(db, 'admin_settings', SLACK_CONFIG_DOC);
    
    await setDoc(configRef, {
      ...config,
      updatedAt: new Date().toISOString()
    });
    
    return true;
  } catch (error) {
    console.error("Erro ao salvar configuração do Slack:", error);
    return false;
  }
}

