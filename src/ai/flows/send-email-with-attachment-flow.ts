
'use server';

/**
 * @fileOverview A Genkit flow for sending emails with attachments using Resend.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Resend } from 'resend';

const SendEmailWithAttachmentInputSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  htmlBody: z.string(),
  attachment: z.object({
    filename: z.string(),
    content: z.string().describe("The Base64-encoded content of the file."),
  }),
});

export type SendEmailWithAttachmentInput = z.infer<typeof SendEmailWithAttachmentInputSchema>;

export async function sendEmailWithAttachment(input: SendEmailWithAttachmentInput): Promise<void> {
  return sendEmailWithAttachmentFlow(input);
}

const sendEmailWithAttachmentFlow = ai.defineFlow(
  {
    name: 'sendEmailWithAttachmentFlow',
    inputSchema: SendEmailWithAttachmentInputSchema,
    outputSchema: z.void(),
  },
  async ({ to, subject, htmlBody, attachment }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      const errorMessage = 'Resend API key is not configured. Cannot send email.';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    const resend = new Resend(apiKey);
    
    // For Resend sandbox, you can only send to the verified email.
    // If you are using a sandbox key, change `to` to your verified email.
    const recipient = 'barry@safeviate.com';
    const finalSubject = subject;

    try {
      const { data, error } = await resend.emails.send({
        from: 'SkyBound Flight Manager <onboarding@resend.dev>',
        to: recipient,
        subject: finalSubject,
        html: htmlBody,
        attachments: [
          {
            filename: attachment.filename,
            content: attachment.content,
            encoding: 'base64',
          },
        ],
      });

      if (error) {
        console.error('Resend API Error:', error);
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      console.error(`Failed to send email with error: ${errorMessage}`);
      throw new Error(`Failed to send email: ${errorMessage}`);
    }
  }
);
