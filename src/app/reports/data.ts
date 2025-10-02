
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, doc, getDoc, writeBatch, where, arrayUnion, addDoc } from 'firebase/firestore';
import type { Booking, Aircraft, User, CompletedChecklist, Alert } from '@/lib/types';
import { format } from 'date-fns';

export async function getReportsPageData(companyId: string): Promise<{ bookings: Booking[], aircraft: Aircraft[], users: User[] }> {
    if (!companyId) {
        return { bookings: [], aircraft: [], users: [] };
    }

    try {
        const bookingsQuery = query(collection(db, `companies/${companyId}/aircraft-bookings`), orderBy('date', 'desc'));
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
        const usersQuery = query(collection(db, `companies/${companyId}/users`));
        const studentsQuery = query(collection(db, `companies/${companyId}/students`));
        
        const [bookingsSnapshot, aircraftSnapshot, usersSnapshot, studentsSnapshot] = await Promise.all([
            getDocs(bookingsQuery),
            getDocs(aircraftQuery),
            getDocs(usersQuery),
            getDocs(studentsQuery),
        ]);

        const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
        const personnel = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const users = [...personnel, ...students];
        
        // This function now returns raw data. All processing is done on the client.
        
        return { bookings, aircraft, users };
    } catch (error) {
        console.error("Failed to fetch reports page data:", error);
        return { bookings: [], aircraft: [], users: [] };
    }
}
