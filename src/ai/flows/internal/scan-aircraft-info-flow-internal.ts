/**
 * @fileOverview The internal implementation of the AI flow for scanning aircraft info from images.
 * This file contains the core Genkit logic and is NOT a Server Action entry point.
 */
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ScanAircraftInfoInputSchema = z.object({
  photoDataUri: z.string().describe("A photo of the aircraft instrument or tail, as a data URI."),
  scanMode: z.enum(['registration', 'hobbs']).describe("Specifies whether to look for the tail number or the Hobbs meter reading."),
});
export type ScanAircraftInfoInput = z.infer<typeof ScanAircraftInfoInputSchema>;

const ScanAircraftInfoOutputSchema = z.object({
  registration: z.string().optional().describe('The aircraft registration number, formatted as ZS-XXX or ZU-XXX.'),
  hobbs: z.number().optional().describe('The Hobbs meter reading as a number with one decimal place.'),
});
export type ScanAircraftInfoOutput = z.infer<typeof ScanAircraftInfoOutputSchema>;

export const scanAircraftInfoFlow = ai.defineFlow(
  {
    name: 'scanAircraftInfoFlowInternal',
    inputSchema: ScanAircraftInfoInputSchema,
    outputSchema: ScanAircraftInfoOutputSchema,
  },
  async ({ photoDataUri, scanMode }) => {
    const prompt = `
      Analyze the attached image.
      You are looking for specific aircraft information.

      If scanMode is 'registration', find the aircraft tail number / registration mark. It typically starts with ZS or ZU.
      If scanMode is 'hobbs', find the Hobbs meter and extract its numerical value. Include the decimal.

      Return only the requested information in the specified format. If the information is not clearly visible, return null for that field.

      Image: {{media url=photoDataUri}}
    `;

    const llmResponse = await ai.generate({
      prompt,
      model: 'googleai/gemini-1.5-flash',
      output: {
        schema: ScanAircraftInfoOutputSchema,
      },
    });

    return llmResponse.output!;
  }
);
