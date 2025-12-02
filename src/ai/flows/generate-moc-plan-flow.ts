'use server';
/**
 * @fileOverview An AI flow for generating a draft implementation plan for a Management of Change (MOC).
 *
 * - generateMocPlan - A function that handles the MOC plan generation.
 * - GenerateMocPlanInput - The input type for the generateMocPlan function.
 * - GenerateMocPlanOutput - The return type for the generateMocPlan function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateMocPlanInputSchema = z.object({
  title: z.string().describe('The title of the Management of Change proposal.'),
  description: z.string().describe('A detailed description of the proposed change.'),
  reason: z.string().describe('The reason or justification for the change.'),
  scope: z.string().describe('The scope of the change, including affected departments and operations.'),
});
export type GenerateMocPlanInput = z.infer<typeof GenerateMocPlanInputSchema>;

const MocRiskSchema = z.object({
    id: z.string(),
    description: z.string(),
    likelihood: z.enum(['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable']),
    severity: z.enum(['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible']),
    riskScore: z.number(),
});

const MocHazardSchema = z.object({
    id: z.string(),
    description: z.string(),
    risks: z.array(MocRiskSchema).optional(),
});

const MocStepSchema = z.object({
    id: z.string(),
    description: z.string(),
    hazards: z.array(MocHazardSchema).optional(),
});

const MocPhaseSchema = z.object({
    id: z.string(),
    description: z.string(),
    steps: z.array(MocStepSchema),
});

const GenerateMocPlanOutputSchema = z.array(MocPhaseSchema);
export type GenerateMocPlanOutput = z.infer<typeof GenerateMocPlanOutputSchema>;

export async function generateMocPlan(input: GenerateMocPlanInput): Promise<GenerateMocPlanOutput> {
  return generateMocPlanFlow(input);
}

const generateMocPlanFlow = ai.defineFlow(
  {
    name: 'generateMocPlanFlow',
    inputSchema: GenerateMocPlanInputSchema,
    outputSchema: GenerateMocPlanOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an expert in aviation safety and change management. Based on the following
      Management of Change (MOC) proposal, generate a structured implementation plan.
      The plan should be broken down into logical phases and steps. For each step,
      identify potential hazards and associated risks.

      **MOC Title:** ${input.title}
      **Description:** ${input.description}
      **Reason:** ${input.reason}
      **Scope:** ${input.scope}

      Generate a comprehensive plan following the required output schema. Ensure all IDs are unique strings. For each risk, provide a valid likelihood and severity. Do not calculate riskScore, just set it to 0.
    `;

    const llmResponse = await ai.generate({
      prompt,
      model: 'googleai/gemini-1.5-flash',
      output: {
        schema: GenerateMocPlanOutputSchema,
      },
    });

    return llmResponse.output!;
  }
);
