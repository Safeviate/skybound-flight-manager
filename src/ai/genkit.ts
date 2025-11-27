
import {genkit, Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export let ai: Genkit;

export function configureGenkit() {
  if (ai) {
    return;
  }
  ai = genkit({
    plugins: [
      googleAI({
        apiKey: process.env.GEMINI_API_KEY,
      }),
    ],
  });
}
