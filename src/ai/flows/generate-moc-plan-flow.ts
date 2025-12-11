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
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const flowUrl = `${baseUrl}/api/genkit-flow`;
  
  const response = await fetch(flowUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ flow: 'generateMocPlan', input }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Genkit flow execution failed:', errorBody);
    throw new Error(`Genkit flow failed with status: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}
