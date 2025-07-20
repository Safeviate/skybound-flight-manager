'use server';

/**
 * @fileOverview An AI tool to suggest potential hazards and risks from a safety report.
 *
 * - suggestHazards - A function that performs the analysis.
 * - SuggestHazardsInput - The input type for the function.
 * - SuggestHazardsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { RiskLikelihood, RiskSeverity } from '@/lib/types';

const SuggestHazardsInputSchema = z.object({
  reportText: z.string().describe('The full text of the safety report.'),
});
export type SuggestHazardsInput = z.infer<typeof SuggestHazardsInputSchema>;

const SuggestedHazardSchema = z.object({
    hazard: z.string().describe('A concise description of the potential hazard identified.'),
    risk: z.string().describe('The associated risk that could result from the hazard.'),
    likelihood: z.enum(['Rare', 'Unlikely', 'Possible', 'Likely', 'Certain']).describe('The estimated likelihood of the risk occurring.'),
    severity: z.enum(['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic']).describe('The estimated severity of the potential outcome.'),
});

const SuggestHazardsOutputSchema = z.object({
  suggestedHazards: z.array(SuggestedHazardSchema).describe('A list of potential hazards and associated risks suggested from the report.'),
});
export type SuggestHazardsOutput = z.infer<typeof SuggestHazardsOutputSchema>;

export async function suggestHazards(
  input: SuggestHazardsInput
): Promise<SuggestHazardsOutput> {
  return suggestHazardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestHazardsPrompt',
  input: {schema: SuggestHazardsInputSchema},
  output: {schema: SuggestHazardsOutputSchema},
  prompt: `You are an expert aviation safety analyst. Your task is to read the following safety report and identify potential hazards and their associated risks.

  For each hazard you identify, you must:
  1.  Clearly state the **hazard** (the condition or object with the potential to cause harm).
  2.  Clearly state the associated **risk** (the potential negative consequence of the hazard).
  3.  Estimate the initial **likelihood** of the risk occurring.
  4.  Estimate the potential **severity** of the outcome.

  Generate 2-4 distinct hazard/risk pairs based on the report.

  Safety Report:
  '''
  {{{reportText}}}
  '''

  Output the results in the required JSON format.`,
});

const suggestHazardsFlow = ai.defineFlow(
  {
    name: 'suggestHazardsFlow',
    inputSchema: SuggestHazardsInputSchema,
    outputSchema: SuggestHazardsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
