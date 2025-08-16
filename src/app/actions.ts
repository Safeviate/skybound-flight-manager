
'use server';

import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { User, Company } from '@/lib/types';
import { ROLE_PERMISSIONS } from '@/lib/types';
import { sendEmail } from '@/ai/flows/send-email-flow';

export async function createUserAndSendWelcomeEmail(
  userData: Omit<User, 'id'>, 
  companyId: string,
  companyName: string,
  welcomeEmailEnabled: boolean,
): Promise<{ success: boolean; message: string }> {
  try {
    let newUserId: string;
    let userExists = false;

    // If email is provided, create user in Firebase Auth
    if (userData.email) {
        const temporaryPassword = Math.random().toString(36).slice(-8);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, temporaryPassword);
            newUserId = userCredential.user.uid;
            
            await updateProfile(userCredential.user, {
                displayName: userData.name,
            });
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
        userToAdd.flightHours = 0;
        userToAdd.progress = 0;
        userToAdd.endorsements = [];
        userToAdd.trainingLogs = [];
    }

    delete (userToAdd as any).password;

    // Save user document to Firestore
    const collectionName = userData.role === 'Student' ? 'students' : 'users';
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
