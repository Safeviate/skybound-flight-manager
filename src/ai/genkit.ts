import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

/**
 * Genkit instance initialized with Google AI plugin.
 */
export const ai = genkit({
  plugins: [googleAI()],
});