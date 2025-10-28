
'use server';
/**
 * @fileOverview An admin-only flow to reset a user's password.
 * This flow requires Firebase Admin SDK credentials to be set up on the server.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as admin from 'firebase-admin';

const AdminResetPasswordInputSchema = z.object({
  userId: z.string().describe('The UID of the user whose password is to be reset.'),
  newPassword: z.string().min(6).describe('The new temporary password for the user.'),
});

export type AdminResetPasswordInput = z.infer<typeof AdminResetPasswordInputSchema>;

const AdminResetPasswordOutputSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    temporaryPassword: z.string().optional(),
});
export type AdminResetPasswordOutput = z.infer<typeof AdminResetPasswordOutputSchema>;


// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    try {
      admin.initializeApp({
        // If you're running on Google Cloud (e.g., Cloud Functions, App Engine),
        // the SDK can automatically discover credentials.
        // Otherwise, you might need to provide a service account:
        // credential: admin.credential.cert(require('/path/to/your/serviceAccountKey.json'))
      });
    } catch (error: any) {
        console.error('Firebase Admin initialization error:', error.message);
    }
}


export async function adminResetPassword(input: AdminResetPasswordInput): Promise<AdminResetPasswordOutput> {
  return adminResetPasswordFlow(input);
}

const adminResetPasswordFlow = ai.defineFlow(
  {
    name: 'adminResetPasswordFlow',
    inputSchema: AdminResetPasswordInputSchema,
    outputSchema: AdminResetPasswordOutputSchema,
  },
  async ({ userId, newPassword }) => {
    if (!admin.apps.length) {
      const errorMsg = "Firebase Admin SDK not initialized. Cannot reset password.";
      console.error(errorMsg);
      return { success: false, message: errorMsg };
    }
    
    try {
      await admin.auth().updateUser(userId, {
        password: newPassword,
      });
      return { success: true, message: 'Password updated successfully.', temporaryPassword: newPassword };
    } catch (error: any) {
      console.error(`Failed to reset password for UID ${userId}:`, error);
      return { success: false, message: error.message };
    }
  }
);
