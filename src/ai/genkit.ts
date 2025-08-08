
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Add a check for the Gemini API key to provide a clear error message if it's missing or invalid.
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_ACTUAL_GEMINI_API_KEY_GOES_HERE') {
    throw new Error("GEMINI_API_KEY is not defined or is set to the placeholder value. Please set it in your environment variables (e.g., in apphosting.yaml).");
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
