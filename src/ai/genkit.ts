<<<<<<< HEAD

import {genkit, Genkit} from 'genkit';
=======
import {genkit} from 'genkit';
>>>>>>> ec137a77f3e963e9fa52915cc7562cf40b7ff9d1
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
