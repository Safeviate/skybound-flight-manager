'use server';
/**
 * @fileOverview A server action for generating a draft implementation plan for a Management of Change (MOC).
 * This file acts as the boundary for the Next.js Server Action.
 *
 * - generateMocPlan - The exported Server Action that clients will call.
 * - GenerateMocPlanInput - The input type for the generateMocPlan function.
 * - GenerateMocPlanOutput - The return type for the generateMocPlan function.
 */

import {
  generateMocPlanFlow,
  type GenerateMocPlanInput,
  type GenerateMocPlanOutput,
} from './internal/generate-moc-plan-flow-internal';

// Export the types for client-side usage.
export type { GenerateMocPlanInput, GenerateMocPlanOutput };

/**
 * Server Action to generate a Management of Change (MOC) implementation plan.
 * @param input The MOC details.
 * @returns A promise that resolves to the generated plan.
 */
export async function generateMocPlan(
  input: GenerateMocPlanInput
): Promise<GenerateMocPlanOutput> {
  return await generateMocPlanFlow(input);
}
