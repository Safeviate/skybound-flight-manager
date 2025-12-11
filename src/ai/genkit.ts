
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
    // Initialize the googleAI plugin with a placeholder API key.
    // WARNING: This is insecure and for build testing only.
    // The real key should be loaded from a secure source like environment variables.
    const googleGenai = googleAI({
      apiKey: 'YOUR_DUMMY_API_KEY_HERE',
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
