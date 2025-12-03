
'use server';
/**
 * @fileOverview A server action for generating a draft implementation plan for a Management of Change (MOC).
 * This file acts as the boundary for the Next.js Server Action, delegating the core logic
 * to an internal API route to work around build-time module resolution issues.
 *
 * - generateMocPlan - The exported Server Action that clients will call.
 * - GenerateMocPlanInput - The input type for the generateMocPlan function.
 * - GenerateMocPlanOutput - The return type for the generateMocPlan function.
 */

import type { GenerateMocPlanInput, GenerateMocPlanOutput } from './internal/generate-moc-plan-flow-internal';

// Export the types for client-side usage.
export type { GenerateMocPlanInput, GenerateMocPlanOutput };

/**
 * Server Action to generate a Management of Change (MOC) implementation plan.
 * It makes a `fetch` call to a dedicated API route to run the Genkit flow,
 * isolating the Genkit dependency from the Server Action build process.
 * @param input The MOC details.
 * @returns A promise that resolves to the generated plan.
 */
export async function generateMocPlan(input: GenerateMocPlanInput): Promise<GenerateMocPlanOutput> {
  // Determine the base URL for the API call.
  // In a Vercel environment (production), we use the public URL.
  // In local development, we use the localhost address.
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  const flowUrl = `${baseUrl}/api/genkit-flow`;

  // --- START DIAGNOSTIC LOGGING ---
  console.log('Attempting to call Genkit flow at:', flowUrl);
  console.log('Request body:', JSON.stringify(input, null, 2));
  // --- END DIAGNOSTIC LOGGING ---
  
  const response = await fetch(flowUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Genkit flow execution failed:', errorBody);
    throw new Error(`Genkit flow failed with status: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}
