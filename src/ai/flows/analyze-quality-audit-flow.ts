'use server';

/**
 * @fileOverview AI tool for assessing quality audit reports.
 *
 * - analyzeQualityAudit - A function that handles the analysis of quality audits.
 * - AnalyzeQualityAuditInput - The input type for the analyzeQualityAudit function.
 * - AnalyzeQualityAuditOutput - The return type for the analyzeQualityAudit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeQualityAuditInputSchema = z.object({
  auditText: z
    .string()
    .describe(
      'The text of the quality audit report to be analyzed.'
    ),
});
export type AnalyzeQualityAuditInput = z.infer<typeof AnalyzeQualityAuditInputSchema>;

const AnalyzeQualityAuditOutputSchema = z.object({
  overallCompliance: z
    .string()
    .describe(
      'The overall compliance status (e.g., Compliant, Partially Compliant, Non-Compliant).'
    ),
  nonConformanceIssues: z
    .string()
    .describe(
      'A summary of any non-conformance issues identified in the audit.'
    ),
  suggestedCorrectiveActions: z
    .string()
    .describe(
      'Recommendations for corrective actions to address identified issues.'
    ),
  areasOfExcellence: z
    .string()
    .describe(
      'Highlights of areas where operations exceed quality standards.'
    ),
});
export type AnalyzeQualityAuditOutput = z.infer<typeof AnalyzeQualityAuditOutputSchema>;

export async function analyzeQualityAudit(
  input: AnalyzeQualityAuditInput
): Promise<AnalyzeQualityAuditOutput> {
  return analyzeQualityAuditFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeQualityAuditPrompt',
  input: {schema: AnalyzeQualityAuditInputSchema},
  output: {schema: AnalyzeQualityAuditOutputSchema},
  prompt: `You are an AI-powered quality assurance analysis tool.

  Analyze the following quality audit report. Identify compliance status, non-conformance issues, and suggest corrective actions. Also, highlight any areas of operational excellence.

  Audit Text: {{{auditText}}}

  Provide an assessment of the overall compliance and specific findings.

  Output the results in JSON format. The schema descriptions in AnalyzeQualityAuditOutputSchema provide more detail.`,
});

const analyzeQualityAuditFlow = ai.defineFlow(
  {
    name: 'analyzeQualityAuditFlow',
    inputSchema: AnalyzeQualityAuditInputSchema,
    outputSchema: AnalyzeQualityAuditOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
