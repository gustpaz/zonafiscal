import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-transaction-category.ts';
import '@/ai/flows/alert-on-financial-risk.ts';
import '@/ai/flows/provide-financial-advice.ts';
import '@/ai/flows/generate-financial-report.ts';
