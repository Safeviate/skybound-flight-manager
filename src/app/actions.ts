

'use server';

import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, updatePassword as updateAuthPassword } from 'firebase/auth';
import type { User, Company, TrainingLogEntry } from '@/lib/types';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { format } from 'date-fns';
import { sendEmail } from '@/ai/flows/send-email-flow';


export async function createUserAndSendWelcomeEmail(
  userData: Omit<User, 'id'>, 
  companyId: string,
  companyName: string,
  welcomeEmailEnabled: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    let newUserId: string;
    let temporaryPassword = '';

    // If email is provided, create user in Firebase Auth
    if (userData.email) {
        temporaryPassword = Math.random().toString(36).slice(-8);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, temporaryPassword);
            newUserId = userCredential.user.uid;
            
            await updateProfile(userCredential.user, {
                displayName: userData.name,
            });

            if (welcomeEmailEnabled) {
                 const loginUrl = process.env.NEXT_PUBLIC_LOGIN_URL || `https://[YOUR_APP_ID].web.app/login`;
                await sendEmail({
                    to: userData.email,
                    subject: `Welcome to ${companyName}`,
                    emailData: {
                        userName: userData.name,
                        companyName: companyName,
                        temporaryPassword: temporaryPassword,
                        loginUrl: loginUrl, 
                    }
                });
            }
            
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                return { success: false, message: "This email address is already in use by another account." };
            }
            throw error; // Rethrow other auth errors
        }
    } else {
        // If no email, create a new document with a generated ID in Firestore
        newUserId = doc(collection(db, 'temp')).id;
    }

    const trainingLogs: TrainingLogEntry[] = [];
    if (userData.role === 'Student' && userData.flightHours && userData.flightHours > 0) {
        const initialLogEntry: TrainingLogEntry = {
            id: `log-${Date.now()}`,
            date: format(new Date(), 'yyyy-MM-dd'),
            aircraft: 'Previous Experience',
            startHobbs: 0,
            endHobbs: userData.flightHours,
            flightDuration: userData.flightHours,
            instructorName: 'Previous Instructor',
            trainingExercises: [{ exercise: 'Consolidated Previous Experience', rating: 4 }],
        };
        trainingLogs.push(initialLogEntry);
    }


    // Prepare user document for Firestore
    const userToAdd: User = {
        ...userData,
        id: newUserId,
        companyId: companyId,
        permissions: ROLE_PERMISSIONS[userData.role] || [],
        status: 'Active',
        mustChangePassword: !!userData.email, // Only if an auth account was created
    } as User;

    if (userData.role === 'Student') {
        userToAdd.flightHours = userData.flightHours || 0;
        userToAdd.progress = 0;
        userToAdd.endorsements = [];
        userToAdd.trainingLogs = trainingLogs;
    }

    delete (userToAdd as any).password;

    // Save user document to the correct Firestore collection
    let collectionName = 'users';
    if (userData.role === 'Student') {
        collectionName = 'students';
    } else if (userData.role === 'Hire and Fly') {
        collectionName = 'hire-and-fly';
    }
    
    await setDoc(doc(db, `companies/${companyId}/${collectionName}`, newUserId), userToAdd);

    return { success: true, message: `${userData.name} has been added.` };

  } catch (error: any) {
    console.error("Error creating user:", error);
    let errorMessage = "An unknown error occurred.";
    if (error.message) {
        errorMessage = error.message;
    }
    return { success: false, message: errorMessage };
  }
}

export async function resetUserPasswordAndSendWelcomeEmail(
  user: User, 
  company: Company,
): Promise<{ success: boolean; message: string }> {
    if (!user.email) {
        return { success: false, message: 'User does not have an email address.' };
    }
    try {
        await sendPasswordResetEmail(auth, user.email);
        return { success: true, message: `A password reset link has been sent to ${user.email}.`};
    } catch (error: any) {
        console.error("Error sending password reset email:", error);
        return { success: false, message: `Failed to send password reset email: ${error.message}` };
    }
}

export async function manuallyResetPassword(
  user: User,
): Promise<{ success: boolean; message: string; temporaryPassword?: string }> {
    const temporaryPassword = Math.random().toString(36).slice(-8);
    // In a real app, you would have a backend function to update the user's password in Firebase Auth.
    // For this simulation, we'll just return the temporary password.
    console.log(`Simulating password reset for ${user.name}. New temp password: ${temporaryPassword}`);
    
    return { success: true, message: `A temporary password has been generated.`, temporaryPassword };
}
