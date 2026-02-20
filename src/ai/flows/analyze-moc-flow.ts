'use server';
/**
 * @fileOverview A Management of Change (MOC) analysis flow.
 * 
 * - analyzeMoc - A function that generates an implementation plan and hazard analysis for a given MOC proposal.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';

const AnalyzeMocInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  reason: z.string(),
  scope: z.string(),
  params: z.string().optional(),
});

const AnalyzeMocOutputSchema = z.object({
  phases: z.array(z.object({
    description: z.string(),
    steps: z.array(z.object({
      description: z.string(),
      hazards: z.array(z.object({
        description: z.string(),
        risks: z.array(z.object({
          description: z.string(),
          likelihood: z.enum(['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable']),
          severity: z.enum(['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible']),
        })),
      })),
    })),
  })),
});

export async function analyzeMoc(input: z.infer<typeof AnalyzeMocInputSchema>) {
  const { output } = await ai.generate({
    model: googleAI.model('gemini-1.5-flash'),
    prompt: `You are an aviation safety management expert specializing in Management of Change (MOC).
    
    Analyze the following MOC proposal and generate a detailed implementation plan.
    Divide the plan into logical phases (e.g., Preparation, Implementation, Verification).
    For each phase, identify specific steps.
    For each step, identify potential hazards created by the change or present during the step.
    For each hazard, identify the associated risk and perform an initial risk assessment (likelihood and severity) based on ICAO Doc 9859 standards.

    MOC Title: ${input.title}
    Description: ${input.description}
    Reason for Change: ${input.reason}
    Scope of Impact: ${input.scope}
    User Request/Focus: ${input.params || 'Standard analysis'}

    Ensure the response follows the requested structure strictly.`,
    output: { schema: AnalyzeMocOutputSchema },
  });

  return output!;
}
