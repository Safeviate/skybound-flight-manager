'use server';
/**
 * @fileOverview A server action for generating a draft implementation plan for a Management of Change (MOC).
 * This file directly invokes the Genkit flow.
 *
 * - generateMocPlan - The exported Server Action that clients will call.
 * - GenerateMocPlanInput - The input type for the generateMocPlan function.
 * - GenerateMocPlanOutput - The return type for the generateMocPlan function.
 */

// Import types and the actual flow implementation directly.
import {
  generateMocPlanFlow,
  type GenerateMocPlanInput,
  type GenerateMocPlanOutput,
} from './internal/generate-moc-plan-flow-internal';

// Export the types for client-side usage.
export type { GenerateMocPlanInput, GenerateMocPlanOutput };

/**
 * Server Action to generate a Management of Change (MOC) implementation plan.
 * This function now directly calls the Genkit flow, removing the problematic
 * internal network request.
 * @param input The MOC details.
 * @returns A promise that resolves to the generated plan.
 */
export async function generateMocPlan(input: GenerateMocPlanInput): Promise<GenerateMocPlanOutput> {
  console.log('Executing generateMocPlanFlow directly...');
  try {
    const result = await generateMocPlanFlow(input);
    console.log('Flow execution successful.');
    return result;
  } catch (error: any) {
    console.error('Genkit flow execution failed directly in Server Action:', error);
    // Re-throw the error to be caught by the calling component
    throw new Error(`Genkit flow failed: ${error.message}`);
  }
}
