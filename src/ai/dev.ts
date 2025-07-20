import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-safety-report-tone.ts';
import '@/ai/flows/analyze-quality-audit-flow.ts';
import '@/ai/flows/suggest-investigation-steps-flow.ts';
import '@/ai/flows/generate-corrective-action-plan-flow.ts';
import '@/ai/flows/promote-to-risk-register-flow.ts';
import '@/ai/flows/five-whys-analysis-flow.ts';
import '@/ai/flows/suggest-hazards-flow.ts';
