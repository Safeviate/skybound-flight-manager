// This file is machine-generated - edit with care!

'use server';

/**
 * @fileOverview AI tool for assessing the tone and severity of user-submitted incident reports.
 *
 * - analyzeSafetyReportTone - A function that handles the analysis of safety reports.
 * - AnalyzeSafetyReportToneInput - The input type for the analyzeSafetyReportTone function.
 * - AnalyzeSafetyReportToneOutput - The return type for the analyzeSafetyReportTone function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSafetyReportToneInputSchema = z.object({
  reportText: z
    .string()
    .describe(
      'The text of the safety report to be analyzed for tone and potential safety issues.'
    ),
});
export type AnalyzeSafetyReportToneInput = z.infer<typeof AnalyzeSafetyReportToneInputSchema>;

const AnalyzeSafetyReportToneOutputSchema = z.object({
  overallTone: z
    .string()
    .describe(
      'The overall tone of the report (e.g., positive, negative, neutral, concerned).'n    ),
  severityLevel: z
    .string()
    .describe(
      'The perceived severity level of the reported incident (e.g., low, medium, high, critical).'n    ),
  potentialSafetyIssues: z
    .string()
    .describe(
      'A summary of potential safety issues identified in the report, if any.'
    ),
  areasForInvestigation: z
    .string()
    .describe(
      'Specific areas or aspects of the report that may require further investigation.'
    ),
  complianceConcerns: z
    .string()
    .describe(
      'Any compliance concerns identified based on the report content, with reference to regulatory requirements.'
    ),
  impactOnOperations: z
    .string()
    .describe(
      'An assessment of the potential impact of the reported incident on flight operations.'
    ),
});
export type AnalyzeSafetyReportToneOutput = z.infer<typeof AnalyzeSafetyReportToneOutputSchema>;

export async function analyzeSafetyReportTone(
  input: AnalyzeSafetyReportToneInput
): Promise<AnalyzeSafetyReportToneOutput> {
  return analyzeSafetyReportToneFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeSafetyReportTonePrompt',
  input: {schema: AnalyzeSafetyReportToneInputSchema},
  output: {schema: AnalyzeSafetyReportToneOutputSchema},
  prompt: `You are an AI-powered safety analysis tool designed to analyze the tone and content of safety reports.

  Analyze the following safety report and identify potential safety issues, areas for further investigation, compliance concerns, and impact on operations.

  Report Text: {{{reportText}}}

  Consider aspects such as regulatory compliance and the potential impact on flight operations.

  Provide an assessment of the overall tone and severity of the report.

  Output the results in JSON format.  The schema descriptions in AnalyzeSafetyReportToneOutputSchema provide more detail.`,
});

const analyzeSafetyReportToneFlow = ai.defineFlow(
  {
    name: 'analyzeSafetyReportToneFlow',
    inputSchema: AnalyzeSafetyReportToneInputSchema,
    outputSchema: AnalyzeSafetyReportToneOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
