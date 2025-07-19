
'use server';

/**
 * @fileOverview AI tool for suggesting investigation steps for a safety report.
 *
 * - suggestInvestigationSteps - A function that suggests investigation steps.
 * - SuggestInvestigationStepsInput - The input type for the suggestInvestigationSteps function.
 * - SuggestInvestigationStepsOutput - The return type for the suggestInvestigationSteps function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { SafetyReport } from '@/lib/types';

const SuggestInvestigationStepsInputSchema = z.object({
  report: z.any().describe('The full safety report object to be analyzed.'),
});
export type SuggestInvestigationStepsInput = z.infer<typeof SuggestInvestigationStepsInputSchema>;

const SuggestInvestigationStepsOutputSchema = z.object({
  initialAssessment: z.string().describe('A brief, one-paragraph summary of the situation and its potential severity.'),
  keyAreasToInvestigate: z.array(z.string()).describe('A list of specific areas or questions that need to be investigated.'),
  recommendedActions: z.array(z.string()).describe('A list of immediate recommended actions to consider, such as grounding an aircraft or interviewing personnel.'),
  potentialContributingFactors: z.array(z.string()).describe('A list of potential contributing factors (e.g., human factors, equipment, environment) to explore.'),
});
export type SuggestInvestigationStepsOutput = z.infer<typeof SuggestInvestigationStepsOutputSchema>;

export async function suggestInvestigationSteps(
  input: SuggestInvestigationStepsInput
): Promise<SuggestInvestigationStepsOutput> {
  return suggestInvestigationStepsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestInvestigationStepsPrompt',
  input: {schema: SuggestInvestigationStepsInputSchema},
  output: {schema: SuggestInvestigationStepsOutputSchema},
  prompt: `You are an expert aviation safety investigator.

  Based on the following safety report, provide a structured plan for investigation. Your response should be professional, thorough, and focused on identifying root causes and preventing recurrence.

  Safety Report Data:
  '''json
  {{{jsonStringify report}}}
  '''

  Analyze the report and provide an initial assessment, key areas to investigate, recommended immediate actions, and potential contributing factors.

  Output the results in JSON format. The schema descriptions in SuggestInvestigationStepsOutputSchema provide more detail on what is expected.`,
});

const suggestInvestigationStepsFlow = ai.defineFlow(
  {
    name: 'suggestInvestigationStepsFlow',
    inputSchema: SuggestInvestigationStepsInputSchema,
    outputSchema: SuggestInvestigationStepsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
