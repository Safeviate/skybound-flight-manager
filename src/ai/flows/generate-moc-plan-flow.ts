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
 * This function now delegates the actual Genkit execution to a separate API route
 * to avoid build issues with transitive dependencies.
 * @param input The MOC details.
 * @returns A promise that resolves to the generated plan.
 */
export async function generateMocPlan(input: GenerateMocPlanInput): Promise<GenerateMocPlanOutput> {
  // Determine the base URL for the fetch call.
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  
  const response = await fetch(`${baseUrl}/api/genkit-flow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Genkit API route failed:', errorBody);
    throw new Error(`Genkit flow failed with status: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}
