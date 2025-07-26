
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
    text: z.string().describe('The text of a single checklist item, which must include a regulatory reference in parentheses.'),
    regulationReference: z.string().describe('The specific regulation code cited in the checklist item text.'),
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
  prompt: `You are an expert aviation quality and safety auditor with deep knowledge of ISO 9001 principles and South African Civil Aviation Authority (SACAA) regulations.

  Your task is to generate a detailed audit checklist based on a specific topic. The checklist must be practical and suitable for use in a professional aviation environment under SACAA oversight.

  Topic: {{{topic}}}
  Number of Items: {{{numItems}}}

  **Crucial Instruction:** For every single checklist item you generate, you **MUST** include a relevant and specific SACAA regulation code (CAR or CATS) in parentheses at the end of the item text. This is not optional. You must also extract that regulation code into the 'regulationReference' field. For example: "Are all pilot licenses current and valid? (SACAA CAR 61.01.1)". If an item is a general best practice under ISO 9001, cite the relevant overarching safety management regulation (e.g., SACAA CAR Part 140). Do not generate any item without a regulation.

  Generate a suitable title for the checklist and exactly {{{numItems}}} checklist items related to the topic, each with its own regulatory reference.

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
