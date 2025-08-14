
'use server';

import { db, auth } from '@/lib/firebase';
import { collection, doc, setDoc, writeBatch, getDoc } from 'firebase/firestore';
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

  const temporaryPassword = Math.random().toString(36).slice(-8);

  try {
    // 1. Create user in Firebase Authentication
    if (!userData.email) {
      throw new Error("Email is required to create a new user account.");
    }
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, temporaryPassword);
    const newUserId = userCredential.user.uid;
    
    await updateProfile(userCredential.user, {
        displayName: userData.name,
    });

    // 2. Prepare user document for Firestore
    const userToAdd: User = {
        ...userData,
        id: newUserId,
        companyId: companyId,
        permissions: ROLE_PERMISSIONS[userData.role] || [],
        status: 'Active',
        mustChangePassword: true,
    } as User;

    if (userData.role === 'Student') {
        userToAdd.flightHours = 0;
        userToAdd.progress = 0;
        userToAdd.endorsements = [];
        userToAdd.trainingLogs = [];
    }

    delete (userToAdd as any).password;

    // 3. Save user document to Firestore
    const collectionName = userData.role === 'Student' ? 'students' : 'users';
    await setDoc(doc(db, `companies/${companyId}/${collectionName}`, newUserId), userToAdd);

    return { success: true, message: `${userData.name} has been added.` };


  } catch (error: any) {
    console.error("Error creating user:", error);
    let errorMessage = "An unknown error occurred.";
    if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use by another account.";
    } else if (error.code === 'auth/weak-password') {
        errorMessage = "The password is too weak. Please use at least 8 characters.";
    } else if (error.message) {
        errorMessage = error.message;
    }
    return { success: false, message: errorMessage };
  }
}
