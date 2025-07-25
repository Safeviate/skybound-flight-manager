
'use server';

/**
 * @fileOverview An AI tool to generate an audit checklist based on a topic.
 *
 * - generateAuditChecklist - A function that performs the generation.
 * - GenerateAuditChecklistInput - The input type for the function.
 * - GenerateAuditChecklistOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateAuditChecklistInputSchema = z.object({
  topic: z.string().describe('The topic for the audit checklist (e.g., "Hangar Safety", "Flight Documentation").'),
  numItems: z.number().int().positive().describe('The number of items to generate for the checklist.'),
});
export type GenerateAuditChecklistInput = z.infer<typeof GenerateAuditChecklistInputSchema>;

const ChecklistItemSchema = z.object({
    text: z.string().describe('The text of a single checklist item.'),
});

const GenerateAuditChecklistOutputSchema = z.object({
  title: z.string().describe('A suitable title for the generated checklist.'),
  items: z.array(ChecklistItemSchema).describe('An array of generated checklist items.'),
});
export type GenerateAuditChecklistOutput = z.infer<typeof GenerateAuditChecklistOutputSchema>;

export async function generateAuditChecklist(
  input: GenerateAuditChecklistInput
): Promise<GenerateAuditChecklistOutput> {
  return generateAuditChecklistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAuditChecklistPrompt',
  input: {schema: GenerateAuditChecklistInputSchema},
  output: {schema: GenerateAuditChecklistOutputSchema},
  prompt: `You are an expert aviation quality and safety auditor.

  Your task is to generate a detailed audit checklist based on a specific topic. The checklist should be practical and suitable for use in a professional aviation environment.

  Topic: {{{topic}}}
  Number of Items: {{{numItems}}}

  Generate a suitable title for the checklist and exactly {{{numItems}}} checklist items related to the topic.

  Output the results in the required JSON format.`,
});

const generateAuditChecklistFlow = ai.defineFlow(
  {
    name: 'generateAuditChecklistFlow',
    inputSchema: GenerateAuditChecklistInputSchema,
    outputSchema: GenerateAuditChecklistOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
