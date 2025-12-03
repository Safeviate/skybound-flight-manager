
'use server';
/**
 * @fileoverview Centralized Genkit initialization and configuration.
 * This file configures the AI provider and exports a singleton `ai` instance
 * to be used across all AI flows in the application.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

let aiInstance: any;

function getAiInstance() {
  if (!aiInstance) {
    // Initialize the googleAI plugin with the API key from environment variables.
    // This now happens at runtime, not build time.
    const googleGenai = googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Configure and export the global Genkit instance.
    aiInstance = genkit({
      plugins: [googleGenai],
    });
  }
  return aiInstance;
}

// Use a getter to ensure the AI instance is initialized only when first accessed.
export const ai = new Proxy({} as any, {
  get: (target, prop) => {
    return Reflect.get(getAiInstance(), prop);
  },
});
