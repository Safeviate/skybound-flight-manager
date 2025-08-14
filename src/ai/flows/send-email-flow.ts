
'use server';

/**
 * @fileOverview A Genkit flow for sending emails using the Resend service.
 *
 * - sendEmail - A function that handles sending emails.
 * - SendEmailInput - The input type for the sendEmail function.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { Resend } from 'resend';

const SendEmailInputSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  emailData: z.object({
    userName: z.string(),
    companyName: z.string(),
    userEmail: z.string().email(),
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
      const errorMessage = 'Resend API key is not configured. Email will not be sent.';
      console.error(errorMessage);
      // We don't throw an error here to allow the rest of the process (e.g., user creation) to succeed.
      // The calling function will handle notifying the user if necessary.
      return; 
    }
    const resend = new Resend(apiKey);

    const { userName, companyName, loginUrl, userEmail } = emailData;
    
    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; background-color: #f4f4f4; color: #333;">
        <h1 style="color: #2563eb; font-size: 24px;">Welcome to ${companyName}</h1>
        <p style="font-size: 16px; line-height: 1.5;">Hello ${userName},</p>
        <p style="font-size: 16px; line-height: 1.5;">
          An account has been created for you in the ${companyName} portal.
        </p>
        <p style="font-size: 16px; line-height: 1.5;">
          To get started, please visit the login page and use the "Forgot Password" link to set your password for the first time.
        </p>
        <a href="${loginUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
          Go to Login Page
        </a>
        <p style="margin-top: 30px; font-size: 12px; color: #777;">
          If you have any questions, please contact your system administrator.
        </p>
      </div>
    `;
    
    const fromAddress = `Safeviate <onboarding@resend.dev>`;

    try {
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: to,
        subject: subject,
        html: htmlBody,
        headers: {
            'X-Entity-Ref-ID': `${to}-${subject}-${new Date().getTime()}`,
        }
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
