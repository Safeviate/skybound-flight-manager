

'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs, orderBy, doc, getDoc, writeBatch } from 'firebase/firestore';
import type { Booking, Aircraft, User, CompletedChecklist } from '@/lib/types';

export async function getReportsPageData(companyId: string): Promise<{ bookings: Booking[], aircraft: Aircraft[], users: User[] }> {
    if (!companyId) {
        return { bookings: [], aircraft: [], users: [] };
    }

    try {
        const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`), orderBy('date', 'desc'));
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
        
        const batch = writeBatch(db);
        let writesToPerform = false;

        const bookingsWithChecklistData = bookings.map(booking => {
            if (booking.bookingNumber && checklistsByBookingNumber.has(booking.bookingNumber)) {
                const { pre, post } = checklistsByBookingNumber.get(booking.bookingNumber)!;
                
                const startHobbs = pre?.results?.hobbs ?? booking.startHobbs;
                const endHobbs = post?.results?.hobbs ?? booking.endHobbs;
                let flightDuration = booking.flightDuration;

                if (typeof startHobbs === 'number' && typeof endHobbs === 'number' && endHobbs > startHobbs) {
                    flightDuration = parseFloat((endHobbs - startHobbs).toFixed(1));
                    
                    if (booking.purpose === 'Training' && booking.studentId) {
                        const studentRef = doc(db, `companies/${companyId}/students/${booking.studentId}`);
                        // Schedule a write to update flightHours, but don't execute it yet.
                        // This logic assumes we need to recalculate totals, which is complex here.
                        // A better approach is to have a separate process or trigger for this.
                        // For this request, we'll focus on the data prep.
                    }
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
        
        // This is a simplified recalculation logic. 
        // A more robust system might use cloud functions to avoid re-calculating all hours on every page load.
        const studentHoursMap = new Map<string, number>();
        students.forEach(s => studentHoursMap.set(s.id, 0));

        bookingsWithChecklistData.forEach(booking => {
            if (booking.status === 'Completed' && booking.purpose === 'Training' && booking.studentId && booking.flightDuration) {
                 const currentHours = studentHoursMap.get(booking.studentId) || 0;
                 studentHoursMap.set(booking.studentId, currentHours + booking.flightDuration);
            }
        });
        
        students.forEach(student => {
            const calculatedHours = studentHoursMap.get(student.id);
            if (calculatedHours !== undefined && student.flightHours !== calculatedHours) {
                const studentRef = doc(db, `companies/${companyId}/students/${student.id}`);
                batch.update(studentRef, { flightHours: calculatedHours });
                writesToPerform = true;
            }
        });

        if (writesToPerform) {
            await batch.commit();
        }

        return { bookings: bookingsWithChecklistData, aircraft, users };
    } catch (error) {
        console.error("Failed to fetch reports page data:", error);
        return { bookings: [], aircraft: [], users: [] };
    }
}
