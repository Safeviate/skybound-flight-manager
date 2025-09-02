

'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import type { Booking, Aircraft, User, CompletedChecklist } from '@/lib/types';

export async function getReportsPageData(companyId: string): Promise<{ bookings: Booking[], aircraft: Aircraft[], users: User[] }> {
    if (!companyId) {
        return { bookings: [], aircraft: [], users: [] };
    }

    try {
        const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`), orderBy('date', 'desc'));
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`));
        const usersQuery = query(collection(db, `companies/${companyId}/users`));
        
        const [bookingsSnapshot, aircraftSnapshot, usersSnapshot] = await Promise.all([
            getDocs(bookingsQuery),
            getDocs(aircraftQuery),
            getDocs(usersQuery),
        ]);

        const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
        const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        
        let allChecklists: CompletedChecklist[] = [];
        for (const acDoc of aircraft) {
            if (acDoc.status === 'Archived') continue;
            const checklistsCol = collection(db, `companies/${companyId}/aircraft/${acDoc.id}/completed-checklists`);
            const checklistsSnap = await getDocs(checklistsCol);
            const checklists = checklistsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as CompletedChecklist));
            allChecklists = allChecklists.concat(checklists);
        }

        const checklistsByBookingNumber = new Map<string, { pre?: CompletedChecklist, post?: CompletedChecklist }>();

        allChecklists.forEach(checklist => {
            if (checklist.bookingNumber) {
                const entry = checklistsByBookingNumber.get(checklist.bookingNumber) || {};
                if (checklist.type === 'Pre-Flight') {
                    entry.pre = checklist;
                } else if (checklist.type === 'Post-Flight') {
                    entry.post = checklist;
                }
                checklistsByBookingNumber.set(checklist.bookingNumber, entry);
            }
        });
        
        const bookingsWithChecklistData = bookings.map(booking => {
            if (booking.bookingNumber && checklistsByBookingNumber.has(booking.bookingNumber)) {
                const { pre, post } = checklistsByBookingNumber.get(booking.bookingNumber)!;
                
                const startHobbs = pre?.results?.hobbs ?? booking.startHobbs;
                const endHobbs = post?.results?.hobbs ?? booking.endHobbs;
                let flightDuration = booking.flightDuration;

                if (startHobbs !== undefined && endHobbs !== undefined) {
                    flightDuration = endHobbs - startHobbs;
                }
                
                return {
                    ...booking,
                    startHobbs: startHobbs,
                    endHobbs: endHobbs,
                    flightDuration: flightDuration,
                    fuelUplift: pre?.results?.fuelUplift ?? post?.results?.fuelUplift ?? booking.fuelUplift,
                    oilUplift: pre?.results?.oilUplift ?? post?.results?.oilUplift ?? booking.oilUplift,
                };
            }
            return booking;
        });

        return { bookings: bookingsWithChecklistData, aircraft, users };
    } catch (error) {
        console.error("Failed to fetch reports page data:", error);
        return { bookings: [], aircraft: [], users: [] };
    }
}
