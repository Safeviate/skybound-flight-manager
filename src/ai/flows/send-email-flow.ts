
'use server';

/**
 * @fileOverview A Genkit flow for sending emails using the Resend service.
 *
 * - sendEmail - A function that handles sending emails.
 * - SendEmailInput - The input type for the sendEmail function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Resend } from 'resend';
import * as React from 'react';
import NewUserCredentialsEmail from '@/components/emails/new-user-credentials-email';

const SendEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  // Pass email component data, not the component itself
  emailData: z.object({
    userName: z.string(),
    companyName: z.string(),
    userEmail: z.string().email(),
    temporaryPassword: z.string().optional(),
    loginUrl: z.string().url(),
  }),
});
export type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export async function sendEmail(input: SendEmailInput): Promise<void> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailInputSchema,
    outputSchema: z.void(),
  },
  async ({ to, subject, emailData }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      const errorMessage = 'Resend API key is not configured. Cannot send email.';
      console.error(errorMessage);
      // Throw an error to ensure the calling function knows about the failure.
      throw new Error(errorMessage);
    }
    const resend = new Resend(apiKey);

    try {
      const { data, error } = await resend.emails.send({
        from: 'SkyBound Flight Manager <onboarding@resend.dev>',
        to,
        subject,
        react: React.createElement(NewUserCredentialsEmail, emailData),
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

    } catch (error: any) {
      // Catch any other exceptions during the process
      const errorMessage = error.message || JSON.stringify(error);
      console.error(`Failed to send email with error: ${errorMessage}`);
      // Re-throw the error to ensure the calling function is aware of the failure.
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }
);
