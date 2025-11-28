<<<<<<< HEAD
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
=======
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
>>>>>>> 17c1a388127b135d7d897244de86b45b2dff0c2a
}
