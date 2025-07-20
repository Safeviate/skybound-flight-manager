'use server';

/**
 * @fileOverview An AI tool to perform a 5 Whys root cause analysis on a safety report.
 *
 * - fiveWhysAnalysis - A function that performs the analysis.
 * - FiveWhysAnalysisInput - The input type for the function.
 * - FiveWhysAnalysisOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FiveWhysAnalysisInputSchema = z.object({
  report: z.any().describe('The full safety report object, including all details and investigation notes.'),
});
export type FiveWhysAnalysisInput = z.infer<typeof FiveWhysAnalysisInputSchema>;

const WhySchema = z.object({
    why: z.string().describe('The "Why?" question being asked.'),
    because: z.string().describe('The answer to the "Why?" question.'),
});

const FiveWhysAnalysisOutputSchema = z.object({
  problemStatement: z.string().describe('A clear, one-sentence statement of the problem based on the report.'),
  analysis: z.array(WhySchema).length(5).describe('An array of 5 "Why" questions and their answers, drilling down to the root cause.'),
  rootCause: z.string().describe('The final, determined root cause of the incident.'),
});
export type FiveWhysAnalysisOutput = z.infer<typeof FiveWhysAnalysisOutputSchema>;

export async function fiveWhysAnalysis(
  input: FiveWhysAnalysisInput
): Promise<FiveWhysAnalysisOutput> {
  return fiveWhysAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fiveWhysAnalysisPrompt',
  input: {schema: z.object({ report: z.string() })},
  output: {schema: FiveWhysAnalysisOutputSchema},
  prompt: `You are an expert aviation safety investigator trained in root cause analysis methodologies, specifically the "5 Whys" technique as applied in ISO 9001 and aviation safety management systems.

  You have been provided with a safety report in JSON format. Your task is to perform a rigorous "5 Whys" analysis to determine the root cause of the incident.

  Safety Report:
  '''json
  {{{report}}}
  '''

  Follow these steps:
  1.  **Define the Problem:** Start by creating a clear and concise problem statement based on the report's heading and details.
  2.  **Ask "Why?" five times:**
      -   **Why 1:** Ask why the problem occurred. The answer should be based directly on the facts in the report.
      -   **Why 2:** Ask why the answer to "Why 1" occurred.
      -   **Why 3:** Ask why the answer to "Why 2" occurred.
      -   **Why 4:** Ask why the answer to "Why 3" occurred.
      -   **Why 5:** Ask why the answer to "Why 4" occurred. This final answer should point towards a process-level or systemic issue. Avoid blaming individuals.
  3.  **Determine the Root Cause:** State the final answer from "Why 5" as the definitive root cause.

  Ensure your analysis is logical, sequential, and grounded in the information provided.

  Output the results in the required JSON format.`,
});

const fiveWhysAnalysisFlow = ai.defineFlow(
  {
    name: 'fiveWhysAnalysisFlow',
    inputSchema: FiveWhysAnalysisInputSchema,
    outputSchema: FiveWhysAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt({ report: JSON.stringify(input.report, null, 2) });
    return output!;
  }
);
