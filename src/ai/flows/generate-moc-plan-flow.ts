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
import { POST } from '@/app/api/genkit-flow/route';

// Export the types for client-side usage.
export type { GenerateMocPlanInput, GenerateMocPlanOutput };

/**
 * Server Action to generate a Management of Change (MOC) implementation plan.
 * This function now calls the API route's logic directly as a function
 * to avoid server-side `fetch` errors.
 * @param input The MOC details.
 * @returns A promise that resolves to the generated plan.
 */
export async function generateMocPlan(input: GenerateMocPlanInput): Promise<GenerateMocPlanOutput> {
  // Create a mock Request object to pass to the POST handler.
  const mockRequest = new Request('http://localhost/api/genkit-flow', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const response = await POST(mockRequest);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Genkit flow execution failed:', errorBody);
    throw new Error(`Genkit flow failed with status: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}
