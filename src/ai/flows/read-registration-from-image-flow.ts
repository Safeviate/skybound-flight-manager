
'use server';

/**
 * @fileOverview An AI tool to read an aircraft registration number from an image.
 *
 * - readRegistrationFromImage - A function that performs the OCR.
 * - ReadRegistrationFromImageInput - The input type for the function.
 * - ReadRegistrationFromImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReadRegistrationFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an aircraft's fuselage or tail, showing the registration number. The photo should be provided as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ReadRegistrationFromImageInput = z.infer<typeof ReadRegistrationFromImageInputSchema>;

const ReadRegistrationFromImageOutputSchema = z.object({
  registration: z.string().describe('The alphanumeric registration number read from the image. For example, "N12345" or "ZS-ABC".'),
});
export type ReadRegistrationFromImageOutput = z.infer<typeof ReadRegistrationFromImageOutputSchema>;

export async function readRegistrationFromImage(
  input: ReadRegistrationFromImageInput
): Promise<ReadRegistrationFromImageOutput> {
  return readRegistrationFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'readRegistrationFromImagePrompt',
  input: {schema: ReadRegistrationFromImageInputSchema},
  output: {schema: ReadRegistrationFromImageOutputSchema},
  prompt: `You are an expert OCR tool for reading aircraft registration numbers (tail numbers).

You will be provided a photo of an aircraft. Your task is to accurately read the registration number from the image.

The value must be a string, containing only the letters and numbers of the registration.

Analyze the following image and return the value in the 'registration' field of the output JSON.

Photo: {{media url=photoDataUri}}`,
});

const readRegistrationFromImageFlow = ai.defineFlow(
  {
    name: 'readRegistrationFromImageFlow',
    inputSchema: ReadRegistrationFromImageInputSchema,
    outputSchema: ReadRegistrationFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
