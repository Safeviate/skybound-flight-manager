
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
  // The model is defined in the prompt definitions.
  // model: 'googleai/gemini-1.5-flash',
});
