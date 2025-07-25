
'use server';

/**
 * @fileOverview An AI tool to suggest an ICAO occurrence category from a safety report.
 *
 * - suggestIcaoCategory - A function that performs the analysis.
 * - SuggestIcaoCategoryInput - The input type for the function.
 * - SuggestIcaoCategoryOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { ICAO_OCCURRENCE_CATEGORIES, ICAO_CODE_DEFINITIONS } from '@/lib/types';


const SuggestIcaoCategoryInputSchema = z.object({
  reportText: z.string().describe('The full text of the safety report.'),
});
export type SuggestIcaoCategoryInput = z.infer<typeof SuggestIcaoCategoryInputSchema>;


const SuggestIcaoCategoryOutputSchema = z.object({
  category: z.enum(ICAO_OCCURRENCE_CATEGORIES).describe('The single most appropriate ICAO ADREP occurrence category.'),
  reasoning: z.string().describe('A brief explanation for why this category was chosen.'),
});
export type SuggestIcaoCategoryOutput = z.infer<typeof SuggestIcaoCategoryOutputSchema>;

export async function suggestIcaoCategory(
  input: SuggestIcaoCategoryInput
): Promise<SuggestIcaoCategoryOutput> {
  return suggestIcaoCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestIcaoCategoryPrompt',
  input: {schema: z.object({ reportText: z.string(), categories: z.string() }) },
  output: {schema: SuggestIcaoCategoryOutputSchema},
  prompt: `You are an expert aviation safety investigator specializing in classifying incidents according to the ICAO ADREP taxonomy.

  Your task is to analyze the following safety report and determine the single most appropriate ICAO occurrence category.

  Safety Report:
  '''
  {{{reportText}}}
  '''
  
  You MUST choose one of the following categories:
  ---
  {{{categories}}}
  ---

  Provide the category code and a brief reasoning for your choice.`,
});

const suggestIcaoCategoryFlow = ai.defineFlow(
  {
    name: 'suggestIcaoCategoryFlow',
    inputSchema: SuggestIcaoCategoryInputSchema,
    outputSchema: SuggestIcaoCategoryOutputSchema,
  },
  async input => {
    const categoryList = ICAO_OCCURRENCE_CATEGORIES.map(code => `${code}: ${ICAO_CODE_DEFINITIONS[code]}`).join('\n');
    const {output} = await prompt({ reportText: input.reportText, categories: categoryList });
    return output!;
  }
);
