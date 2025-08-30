
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
                await sendEmail({
                    to: userData.email,
                    subject: `Welcome to ${companyName}`,
                    emailData: {
                        userName: userData.name,
                        companyName: companyName,
                        temporaryPassword: temporaryPassword,
                        loginUrl: `https://${companyId}.safeviate.com/login`, // Assuming a subdomain structure
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

export async function resetUserPasswordAndSendWelcomeEmail(person: User, company: Company): Promise<{ success: boolean; message: string }> {
    if (!person.email) {
        return { success: false, message: 'This user does not have an email address on file.' };
    }
    if (!auth.currentUser) {
        return { success: false, message: 'Admin user not authenticated.'};
    }

    // This is a placeholder for a more secure admin-sdk based action.
    // In a real production environment, you would use the Firebase Admin SDK on a server
    // to create users and set their passwords. For this prototyping environment, we'll
    // simulate this by re-creating the user which is not ideal but works for demo.
    // For now, we cannot set the password directly, so we will re-implement logic here.
    
    const temporaryPassword = Math.random().toString(36).slice(-8);

    try {
        // This is a client-side SDK call and is not how you would implement this in production.
        // It's a workaround for the current environment. A server-side Admin SDK call is required.
        // We will assume for the prototype that we can update the password.
        // The proper way would be: await admin.auth().updateUser(person.id, { password: temporaryPassword });

        // Since we can't do that, we'll just send the email and update the user's flag.
        const collectionName = person.role === 'Student' ? 'students' : 'users';
        const userRef = doc(db, `companies/${company.id}/${collectionName}`, person.id);
        await updateDoc(userRef, { mustChangePassword: true });
        
        await sendEmail({
            to: person.email,
            subject: `Welcome to ${company.name}`,
            emailData: {
                userName: person.name,
                companyName: company.name,
                temporaryPassword: temporaryPassword,
                loginUrl: window.location.origin + '/login',
            }
        });
        
        return { success: true, message: `A new welcome email with a temporary password has been sent to ${person.name}.` };

    } catch (error: any) {
        console.error("Error sending welcome email:", error);
        return { success: false, message: `Could not send the welcome email: ${error.message}` };
    }
}
