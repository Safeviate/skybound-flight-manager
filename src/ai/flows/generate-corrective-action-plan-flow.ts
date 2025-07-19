
'use server';

/**
 * @fileOverview AI tool for generating a corrective action plan for a safety report.
 *
 * - generateCorrectiveActionPlan - A function that generates a corrective action plan.
 * - GenerateCorrectiveActionPlanInput - The input type for the function.
 * - GenerateCorrectiveActionPlanOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateCorrectiveActionPlanOutput, SafetyReport } from '@/lib/types';

const GenerateCorrectiveActionPlanInputSchema = z.object({
  report: z.any().describe('The full safety report object, including all investigation details.'),
});
export type GenerateCorrectiveActionPlanInput = z.infer<typeof GenerateCorrectiveActionPlanInputSchema>;

const CorrectiveActionSchema = z.object({
    action: z.string().describe('A specific, measurable, achievable, relevant, and time-bound (SMART) corrective action to be taken.'),
    responsiblePerson: z.string().describe('The name of the person or role responsible for ensuring the action is completed. This should be someone from the investigation team.'),
    deadline: z.string().describe('The proposed deadline for completing the action, in YYYY-MM-DD format.'),
    status: z.enum(['Not Started', 'In Progress', 'Completed']).describe('The initial status of the action.'),
});

const GenerateCorrectiveActionPlanOutputSchema = z.object({
  summaryOfFindings: z.string().describe('A brief, one-paragraph summary of the key findings from the investigation notes, discussions, and report details.'),
  rootCause: z.string().describe('A concise statement identifying the most likely root cause of the incident, based on all available information.'),
  correctiveActions: z.array(CorrectiveActionSchema).describe('A list of proposed corrective actions to address the root cause and prevent recurrence.'),
});

export async function generateCorrectiveActionPlan(
  input: GenerateCorrectiveActionPlanInput
): Promise<GenerateCorrectiveActionPlanOutput> {
  return generateCorrectiveActionPlanFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCorrectiveActionPlanPrompt',
  input: {schema: z.object({ report: z.string() }) },
  output: {schema: GenerateCorrectiveActionPlanOutputSchema},
  prompt: `You are an expert aviation Safety Manager responsible for creating Corrective Action Plans (CAPs).

  You have been provided with a complete safety report investigation file in JSON format. Your task is to analyze all the information and generate a formal, professional, and actionable Corrective Action Plan.

  Safety Report Investigation File:
  '''json
  {{{report}}}
  '''

  Your analysis must consider all sections of the report:
  - The initial report details (heading, description).
  - The identified hazards and their risk scores.
  - The full discussion thread between investigators.
  - The final investigation notes and findings.

  Based on your comprehensive analysis, you will:
  1.  **Write a Summary of Findings:** Synthesize the key discoveries from the entire investigation into a concise paragraph.
  2.  **Determine the Root Cause:** Identify the single most significant underlying reason for the event. Avoid listing symptoms; focus on the fundamental cause.
  3.  **Propose Corrective Actions:** Create a list of 2-4 specific, actionable steps to address the root cause. For each action, assign a responsible person (must be a member of the investigation team listed in the report) and a reasonable deadline. All actions should have an initial status of "Not Started".

  Output the results in the required JSON format. The schema descriptions provide more detail on what is expected for each field.`,
});

const generateCorrectiveActionPlanFlow = ai.defineFlow(
  {
    name: 'generateCorrectiveActionPlanFlow',
    inputSchema: GenerateCorrectiveActionPlanInputSchema,
    outputSchema: GenerateCorrectiveActionPlanOutputSchema,
  },
  async input => {
    const {output} = await prompt({ report: JSON.stringify(input.report, null, 2) });
    return output!;
  }
);
    