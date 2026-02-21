'use server';
/**
 * @fileOverview Management of Change (MOC) Analysis AI Flow.
 * 
 * - analyzeMoc: Generates a structured implementation plan from an MOC proposal.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeMocInputSchema = z.object({
  title: z.string().describe('The title of the proposed change.'),
  description: z.string().describe('A detailed description of the change.'),
  reason: z.string().describe('The reason why the change is being implemented.'),
  scope: z.string().describe('The scope and departments affected by the change.'),
});

const AnalyzeMocOutputSchema = z.object({
  phases: z.array(z.object({
    description: z.string().describe('The description of the implementation phase.'),
    steps: z.array(z.object({
      description: z.string().describe('A specific action step within the phase.'),
      hazards: z.array(z.object({
        description: z.string().describe('An identified hazard associated with this step.'),
        risks: z.array(z.object({
          description: z.string().describe('A potential risk resulting from the hazard.'),
          likelihood: z.enum(['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable']),
          severity: z.enum(['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible']),
        })),
      })),
    })),
  })),
});

export type AnalyzeMocInput = z.infer<typeof AnalyzeMocInputSchema>;
export type AnalyzeMocOutput = z.infer<typeof AnalyzeMocOutputSchema>;

const analyzeMocPrompt = ai.definePrompt({
  name: 'analyzeMocPrompt',
  input: {schema: AnalyzeMocInputSchema},
  output: {schema: AnalyzeMocOutputSchema},
  prompt: `You are a specialized aviation safety manager. Analyze the following Management of Change (MOC) proposal and generate a structured implementation plan.
      
      Proposal Title: {{{title}}}
      Description: {{{description}}}
      Reason for Change: {{{reason}}}
      Scope: {{{scope}}}
      
      Your goal is to create a logical, phased implementation plan. 
      For each phase, define specific steps. 
      Critically, for each step, identify potential safety hazards and the risks they pose.
      Provide risk assessments using the standard ICAO categories for likelihood and severity.
      
      Be thorough and ensure the plan addresses regulatory compliance, technical verification, and training where applicable.`,
});

/**
 * Analyze a Management of Change proposal using Generative AI.
 */
export async function analyzeMoc(input: AnalyzeMocInput): Promise<AnalyzeMocOutput> {
  const {output} = await analyzeMocPrompt(input);
  if (!output) {
    throw new Error('AI failed to generate implementation plan.');
  }
  return output;
}