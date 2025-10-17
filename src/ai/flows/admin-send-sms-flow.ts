
'use server';
/**
 * @fileOverview An admin-only flow to send an SMS to a user.
 * This is a placeholder and would need a real SMS provider like Twilio.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AdminSendSmsInputSchema = z.object({
  userId: z.string().describe('The UID of the user to send the SMS to.'),
  phone: z.string().describe('The phone number to send the SMS to.'),
});

export type AdminSendSmsInput = z.infer<typeof AdminSendSmsInputSchema>;

export async function adminSendSms(input: AdminSendSmsInput): Promise<{ success: boolean; message: string }> {
  return adminSendSmsFlow(input);
}

const adminSendSmsFlow = ai.defineFlow(
  {
    name: 'adminSendSmsFlow',
    inputSchema: AdminSendSmsInputSchema,
    outputSchema: z.object({
        success: z.boolean(),
        message: z.string(),
    }),
  },
  async ({ userId, phone }) => {
    // In a real application, you would integrate an SMS service like Twilio here.
    // This is a simulation for demonstration purposes.
    const oneTimeCode = Math.floor(100000 + Math.random() * 900000).toString();

    console.log(`
      *************************************************
      *** SMS SIMULATION ***
      TO: ${phone} (User ID: ${userId})
      MESSAGE: Your verification code is ${oneTimeCode}
      *************************************************
    `);
    
    // Here you would call the Twilio API, for example:
    // try {
    //   const twilio = require('twilio');
    //   const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    //   await client.messages.create({
    //     body: `Your verification code is ${oneTimeCode}`,
    //     from: process.env.TWILIO_PHONE_NUMBER,
    //     to: phone,
    //   });
    //   // You would also need to store this code temporarily, maybe in the user's Firestore doc with an expiry.
    //   return { success: true, message: 'SMS sent successfully.' };
    // } catch (error: any) {
    //   console.error(`Failed to send SMS to ${phone}:`, error);
    //   return { success: false, message: error.message };
    // }

    // For now, we just return success. The login page will need to be adapted
    // to handle this simulated code if we want a full E2E demo without a real SMS service.
    // The current login page phone auth flow generates its own code via Firebase Auth,
    // so this admin-initiated flow is separate.
    return { success: true, message: 'Simulated SMS sent successfully.' };
  }
);
