
'use server';

/**
 * @fileOverview An AI tool to analyze a Management of Change (MOC) proposal.
 *
 * - analyzeMoc - A function that performs the analysis.
 * - AnalyzeMocInput - The input type for the function.
 * - AnalyzeMocOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { RiskLikelihood, RiskSeverity } from '@/lib/types';

const AnalyzeMocInputSchema = z.object({
  title: z.string().describe('The title of the proposed change.'),
  description: z.string().describe('The detailed description of the change.'),
  reason: z.string().describe('The reason or justification for the change.'),
  scope: z.string().describe('The scope of the change (e.g., departments, personnel, operations affected).'),
});
export type AnalyzeMocInput = z.infer<typeof AnalyzeMocInputSchema>;

const likelihoodEnum = z.enum(['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable']);
const severityEnum = z.enum(['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible']);

const MocRiskSchema = z.object({
  description: z.string().describe('A concise description of a potential risk associated with the hazard.'),
  likelihood: likelihoodEnum.describe('The initial likelihood of the risk occurring.'),
  severity: severityEnum.describe('The initial severity of the risk\'s potential outcome.'),
});

const MocHazardSchema = z.object({
  description: z.string().describe('A concise description of the potential hazard identified for this phase.'),
  risks: z.array(MocRiskSchema).min(1).describe('An array of one or more potential risks associated with the identified hazard.'),
});

const MocStepSchema = z.object({
  description: z.string().describe('A high-level implementation phase or step for the proposed change.'),
  hazards: z.array(MocHazardSchema).describe('An array of potential hazards identified for this implementation phase. If no specific hazards are identified for a phase, return an empty array.'),
});

const AnalyzeMocOutputSchema = z.object({
  steps: z.array(MocStepSchema).min(3).describe('An array of 3-5 high-level implementation phases.'),
});
export type AnalyzeMocOutput = z.infer<typeof AnalyzeMocOutputSchema>;

export async function analyzeMoc(
  input: AnalyzeMocInput
): Promise<AnalyzeMocOutput> {
  return analyzeMocFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeMocPrompt',
  input: {schema: AnalyzeMocInputSchema},
  output: {schema: AnalyzeMocOutputSchema},
  prompt: `You are an expert Aviation Safety Manager with extensive experience in Management of Change (MOC) processes under ICAO Doc 9859.

  You have been given a Management of Change proposal. Your task is to perform an initial analysis to assist the safety team.

  MOC Proposal:
  - Title: {{{title}}}
  - Description: {{{description}}}
  - Reason for Change: {{{reason}}}
  - Scope of Change: {{{scope}}}

  Based on this proposal, you must:
  1.  **Deconstruct the change into high-level implementation phases.** Generate 3 to 5 logical steps that would be required to implement this change successfully. Examples include "Update Operations Manual", "Conduct Personnel Training", "Amend Regulatory Approvals", "Procure New Equipment", "Update Software Systems", etc.
  2.  **For each implementation phase, identify potential new hazards.** Think about what could go wrong during or after each phase. If a phase is purely administrative (like updating a document) and introduces no new operational hazards, you can return an empty array for its hazards.
  3.  **For each hazard, identify the associated risks.** A risk is the potential negative consequence of a hazard.
  4.  **Perform an initial risk assessment for each risk.** Assign an initial 'likelihood' and 'severity' based on your expert judgment.

  Structure your entire output in the required JSON format.
  `,
});

const analyzeMocFlow = ai.defineFlow(
  {
    name: 'analyzeMocFlow',
    inputSchema: AnalyzeMocInputSchema,
    outputSchema: AnalyzeMocOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
