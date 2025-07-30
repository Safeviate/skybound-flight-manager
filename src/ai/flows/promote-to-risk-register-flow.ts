
'use server';

/**
 * @fileOverview AI tool for promoting a safety report hazard to the main risk register.
 *
 * - promoteToRiskRegister - A function that handles the promotion.
 * - PromoteToRiskRegisterInput - The input type for the function.
 * - PromoteToRiskRegisterOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {AssociatedRisk, SafetyReport, Risk} from '@/lib/types';

const PromoteToRiskRegisterInputSchema = z.object({
  report: z.any().describe('The full safety report object.'),
  riskToPromote: z.any().describe('The specific associated risk object to be promoted.'),
});
export type PromoteToRiskRegisterInput = z.infer<typeof PromoteToRiskRegisterInputSchema>;

const PromoteToRiskRegisterOutputSchema = z.object({
  description: z.string().describe('A concise, formal description of the risk for the register.'),
  mitigation: z.string().describe('A brief, high-level summary of initial mitigation steps to consider.'),
  status: z.enum(['Open', 'Mitigated', 'Closed']).describe('The initial status of the risk.'),
  hazardArea: z.enum(['Flight Operations', 'Maintenance', 'Ground Operations', 'Cabin Safety', 'Occupational Safety', 'Security', 'Administration & Management']).describe("The general area of operations where the hazard exists."),
  process: z.string().describe("The specific process or activity during which the hazard occurs (e.g., Landing, Takeoff, Refueling)."),
  reportNumber: z.string().describe("The report number from the source safety report.")
});
export type PromoteToRiskRegisterOutput = z.infer<typeof PromoteToRiskRegisterOutputSchema>;

export async function promoteToRiskRegister(
  input: PromoteToRiskRegisterInput
): Promise<PromoteToRiskRegisterOutput> {
  return promoteToRiskRegisterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'promoteToRiskRegisterPrompt',
  input: {schema: z.object({ reportJson: z.string(), riskJson: z.string() }) },
  output: {schema: PromoteToRiskRegisterOutputSchema},
  prompt: `You are an aviation Safety Manager. Your task is to take a hazard identified in a specific safety report and create a formal entry for the central Risk Register.

You will be given the full safety report and the specific hazard details in JSON format.

Safety Report:
'''json
{{{reportJson}}}
'''

Hazard to Promote:
'''json
{{{riskJson}}}
'''

Based on this information:
1.  Write a formal, one-sentence **description** of the risk suitable for a high-level risk register. This should be more general than the specific instance in the report. For example, if the hazard is "bird flew close to N12345 on final", the description could be "Risk of bird strikes on approach or departure paths."
2.  Suggest a brief, one-sentence initial **mitigation** strategy. For example, "Review bird dispersal procedures and pilot briefing protocols."
3.  Set the initial **status** to "Open".
4.  From the safety report's context and the hazard details, determine the most relevant **hazardArea**.
5.  From the safety report's context and the hazard details, determine the most relevant **process** or activity.
6.  Extract the **reportNumber** from the main safety report.

Output the results in the required JSON format.`,
});

const promoteToRiskRegisterFlow = ai.defineFlow(
  {
    name: 'promoteToRiskRegisterFlow',
    inputSchema: PromoteToRiskRegisterInputSchema,
    outputSchema: PromoteToRiskRegisterOutputSchema,
  },
  async input => {
    const {output} = await prompt({ 
        reportJson: JSON.stringify(input.report, null, 2),
        riskJson: JSON.stringify(input.riskToPromote, null, 2),
    });
    return output!;
  }
);
