
import { MyDashboardPageContent } from './my-dashboard-page-content';
import { getDashboardData } from './data';
import { UserProvider, useUser } from '@/context/user-provider'; // We need a way to get the user on the server
import { auth } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Booking } from '@/lib/types';


// This is a simplified way to get the current user on the server.
// In a real app, you might use a more robust session management system.
async function getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
        // This will be the case on initial server render.
        // The client-side UserProvider will handle auth state changes.
        return null; 
    }

    const companyId = 'skybound-aero'; // Hardcoded for this app
    const userRef = doc(db, `companies/${companyId}/users`, firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as User;
    }

    return null;
}


export default async function MyDashboardPage() {
    // This page will now fetch data on the server.
    // However, getting the current user on the server is complex with client-side auth.
    // The best approach here is to let the client component trigger the data fetch once the user is available.
    // The page itself remains a simple container.
    return <MyDashboardPageContent />;
}

MyDashboardPage.title = "My Dashboard";
