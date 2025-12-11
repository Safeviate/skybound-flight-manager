/**
 * @fileOverview The internal implementation of the AI flow for analyzing safety reports.
 * This file contains the core Genkit logic and is NOT a Server Action entry point.
 */
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeSafetyReportInputSchema = z.object({
  reportText: z.string().describe('The full text of the safety report to be analyzed.'),
});
export type AnalyzeSafetyReportInput = z.infer<typeof AnalyzeSafetyReportInputSchema>;

const AnalyzeSafetyReportOutputSchema = z.object({
  overallTone: z.string().describe('A brief (2-3 word) description of the overall tone of the report (e.g., "Urgent and Concerned", "Formal and Factual").'),
  severityLevel: z.enum(['Critical', 'High', 'Medium', 'Low', 'Informational']).describe('The assessed severity level of the reported incident.'),
  potentialSafetyIssues: z.array(z.string()).describe('A list of potential safety issues identified in the report.'),
  areasForInvestigation: z.array(z.string()).describe('A list of specific areas or topics that warrant further investigation.'),
  complianceConcerns: z.array(z.string()).describe('A list of any potential regulatory compliance issues or concerns mentioned.'),
  impactOnOperations: z.string().describe('A brief summary of the potential or actual impact on flight or ground operations.'),
});
export type AnalyzeSafetyReportOutput = z.infer<typeof AnalyzeSafetyReportOutputSchema>;

export const analyzeSafetyReportFlow = ai.defineFlow(
  {
    name: 'analyzeSafetyReportFlow',
    inputSchema: AnalyzeSafetyReportInputSchema,
    outputSchema: AnalyzeSafetyReportOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are an expert aviation safety officer. Analyze the following safety report text.
      Your task is to assess its tone, severity, and identify key areas for follow-up.
      Provide a structured analysis based on the output schema.

      Report Text:
      """
      ${input.reportText}
      """
    `;

    const llmResponse = await ai.generate({
      prompt,
      model: 'googleai/gemini-1.5-flash',
      output: {
        schema: AnalyzeSafetyReportOutputSchema,
      },
    });

    return llmResponse.output!;
  }
);
