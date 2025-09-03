

'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import type { Aircraft, Booking, User, CompletedChecklist } from '@/lib/types';

export async function getSchedulePageData(companyId: string): Promise<{ aircraft: Aircraft[], bookings: Booking[], users: User[] }> {
    if (!companyId) {
        return { aircraft: [], bookings: [], users: [] };
    }

    try {
        const aircraftQuery = query(collection(db, `companies/${companyId}/aircraft`), where('status', '!=', 'Archived'));
        const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
        const personnelQuery = query(collection(db, `companies/${companyId}/users`));
        const studentsQuery = query(collection(db, `companies/${companyId}/students`));

        const [aircraftSnapshot, bookingsSnapshot, personnelSnapshot, studentsSnapshot] = await Promise.all([
            getDocs(aircraftQuery),
            getDocs(bookingsQuery),
            getDocs(personnelQuery),
            getDocs(studentsQuery),
        ]);

        const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
        const bookings = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const personnel = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const users = [...personnel, ...students];
        
        let allChecklists: CompletedChecklist[] = [];
        for (const acDoc of aircraft) {
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

                if (typeof startHobbs === 'number' && typeof endHobbs === 'number' && endHobbs > startHobbs) {
                    flightDuration = parseFloat((endHobbs - startHobbs).toFixed(1));
                }
                
                return {
                    ...booking,
                    startHobbs: startHobbs,
                    endHobbs: endHobbs,
                    flightDuration: flightDuration,
                };
            }
            return booking;
        });

        return { aircraft, bookings: bookingsWithChecklistData, users };
    } catch (error) {
        console.error("Failed to fetch schedule page data:", error);
        return { aircraft: [], bookings: [], users: [] };
    }
}


