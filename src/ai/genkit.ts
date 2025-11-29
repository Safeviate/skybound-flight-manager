import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
<<<<<<< HEAD
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
=======
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY,
    }),
  ],
>>>>>>> e06c5ae4708e9124cea1a3f89e049a022b5097df
});
