import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Genkit instance initialized with Google AI plugin.
 * This object is used to define prompts, flows, and tools.
 */
export const ai = genkit({
  plugins: [googleAI()],
});