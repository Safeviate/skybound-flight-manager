
'use server';

/**
 * @fileOverview An AI tool to generate a corrective action plan for a quality audit finding.
 *
 * - generateQualityCap - A function that performs the generation.
 * - GenerateQualityCapInput - The input type for the function.
 * - GenerateQualityCapOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQualityCapInputSchema = z.object({
  nonConformanceText: z.string().describe('The text of the non-conformance finding, including the item, regulation, and auditor comment.'),
});
export type GenerateQualityCapInput = z.infer<typeof GenerateQualityCapInputSchema>;

const GenerateQualityCapOutputSchema = z.object({
  rootCause: z.string().describe('A concise statement identifying the most likely root cause of the non-conformance.'),
  correctiveAction: z.string().describe('A specific, measurable, achievable, relevant, and time-bound (SMART) corrective action to address the immediate issue.'),
    preventativeAction: z.string().describe('A specific action to address the root cause and prevent the issue from recurring in the future.'),
});
export type GenerateQualityCapOutput = z.infer<typeof GenerateQualityCapOutputSchema>;

export async function generateQualityCap(
  input: GenerateQualityCapInput
): Promise<GenerateQualityCapOutput> {
  return generateQualityCapFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQualityCapPrompt',
  input: {schema: GenerateQualityCapInputSchema},
  output: {schema: GenerateQualityCapOutputSchema},
  prompt: `You are an expert aviation Quality Manager responsible for creating Corrective Action Plans (CAPs) for audit findings.

  You have been provided with the details of a non-conformance from a quality audit. Your task is to analyze the finding and generate a concise but effective Corrective Action Plan.

  Non-Conformance Details:
  '''
  {{{nonConformanceText}}}
  '''

  Based on this information:
  1.  **Determine the Root Cause:** Analyze the finding and identify the most probable underlying reason for the non-conformance.
  2.  **Propose a Corrective Action:** Define a specific action to fix the immediate problem identified.
  3.  **Propose a Preventative Action:** Define a specific action to address the root cause and prevent this issue from happening again.

  Output the results in the required JSON format.`,
});

const generateQualityCapFlow = ai.defineFlow(
  {
    name: 'generateQualityCapFlow',
    inputSchema: GenerateQualityCapInputSchema,
    outputSchema: GenerateQualityCapOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
