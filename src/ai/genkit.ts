
'use server';
/**
 * @fileoverview Centralized Genkit initialization and configuration.
 * This file configures the AI provider and exports a singleton `ai` instance
 * to be used across all AI flows in the application.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize the googleAI plugin with the API key from environment variables.
const googleGenai = googleAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Configure and export the global Genkit instance.
export const ai = genkit({
  plugins: [googleGenai],
});
