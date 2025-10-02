
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { Aircraft, Booking, User, CompletedChecklist } from '@/lib/types';

export async function getSchedulePageData(companyId: string): Promise<{ aircraft: Aircraft[], bookings: Booking[], users: User[], hireAndFly: User[] }> {
    if (!companyId) {
        return { aircraft: [], bookings: [], users: [], hireAndFly: [] };
    }

    try {
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`), where('status', '!=', 'Archived'));
        const aircraftBookingsQuery = query(collection(db, `companies/${companyId}/aircraft-bookings`));
        const facilityBookingsQuery = query(collection(db, `companies/${companyId}/facility-bookings`));
        const personnelQuery = query(collection(db, `companies/${companyId}/users`));
        const studentsQuery = query(collection(db, `companies/${companyId}/students`));
        const hireAndFlyQuery = query(collection(db, `companies/${companyId}/hire-and-fly`));

        const [
            aircraftSnapshot, 
            aircraftBookingsSnapshot,
            facilityBookingsSnapshot,
            personnelSnapshot, 
            studentsSnapshot, 
            hireAndFlySnapshot
        ] = await Promise.all([
            getDocs(aircraftQuery),
            getDocs(aircraftBookingsQuery),
            getDocs(facilityBookingsQuery),
            getDocs(personnelQuery),
            getDocs(studentsQuery),
            getDocs(hireAndFlyQuery),
        ]);

        const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
        const aircraftBookings = aircraftBookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const facilityBookings = facilityBookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const bookings = [...aircraftBookings, ...facilityBookings];

        const personnel = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const hireAndFly = hireAndFlySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        
        const users = [...personnel, ...students];

        return { aircraft, bookings, users, hireAndFly };
    } catch (error) {
        console.error("Failed to fetch schedule page data:", error);
        return { aircraft: [], bookings: [], users: [], hireAndFly: [] };
    }
}
