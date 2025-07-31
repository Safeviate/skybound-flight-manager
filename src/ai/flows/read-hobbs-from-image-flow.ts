'use server';

/**
 * @fileOverview An AI tool to read a Hobbs meter from an image.
 *
 * - readHobbsFromImage - A function that performs the OCR.
 * - ReadHobbsFromImageInput - The input type for the function.
 * - ReadHobbsFromImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ReadHobbsFromImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of an aircraft Hobbs meter, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ReadHobbsFromImageInput = z.infer<typeof ReadHobbsFromImageInputSchema>;

const ReadHobbsFromImageOutputSchema = z.object({
  hobbsValue: z.number().describe('The numerical value read from the Hobbs meter, including one decimal place. For example, if the meter shows 1234.5, this value should be 1234.5.'),
});
export type ReadHobbsFromImageOutput = z.infer<typeof ReadHobbsFromImageOutputSchema>;

export async function readHobbsFromImage(
  input: ReadHobbsFromImageInput
): Promise<ReadHobbsFromImageOutput> {
  return readHobbsFromImageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'readHobbsFromImagePrompt',
  input: {schema: ReadHobbsFromImageInputSchema},
  output: {schema: ReadHobbsFromImageOutputSchema},
  prompt: `You are an expert OCR tool for reading analog aircraft gauges.

You will be provided a photo of an aircraft Hobbs meter. Your task is to accurately read the numerical value from the meter.

The value must be a number, including the single decimal digit.

For example, if the meter shows "1234.5", you must return the number 1234.5.

Analyze the following image and return the value in the 'hobbsValue' field of the output JSON.

Photo: {{media url=photoDataUri}}`,
});

const readHobbsFromImageFlow = ai.defineFlow(
  {
    name: 'readHobbsFromImageFlow',
    inputSchema: ReadHobbsFromImageInputSchema,
    outputSchema: ReadHobbsFromImageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
