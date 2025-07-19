import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-safety-report-tone.ts';
import '@/ai/flows/analyze-quality-audit-flow.ts';
import '@/ai/flows/suggest-investigation-steps-flow.ts';
