import { Genkit, genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

let ai: Genkit;

export function getAi() {
  if (ai) {
    return ai;
  }

  ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
    model: 'googleai/gemini-2.0-flash',
  });

  return ai;
}
