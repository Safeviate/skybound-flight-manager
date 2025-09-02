

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
        
        const studentHoursMap = new Map<string, number>();
        students.forEach(s => studentHoursMap.set(s.id, 0));

        bookingsWithChecklistData.forEach(booking => {
            if (booking.status === 'Completed' && booking.purpose === 'Training' && booking.studentId && booking.flightDuration) {
                 const currentHours = studentHoursMap.get(booking.studentId) || 0;
                 studentHoursMap.set(booking.studentId, currentHours + booking.flightDuration);
            }
        });
        
        for (const student of students) {
            const calculatedHours = studentHoursMap.get(student.id);
            if (calculatedHours !== undefined && student.flightHours !== calculatedHours) {
                const studentRef = doc(db, `companies/${companyId}/students/${student.id}`);
                batch.update(studentRef, { flightHours: calculatedHours });
                writesToPerform = true;
                
                const milestones = [10, 20, 30];
                const notificationsSent = student.milestoneNotificationsSent || [];

                for (const milestone of milestones) {
                    if (calculatedHours >= milestone && !notificationsSent.includes(milestone)) {
                        
                        const headOfTrainingQuery = query(collection(db, `companies/${companyId}/users`), where('role', '==', 'Head Of Training'));
                        const hotSnapshot = await getDocs(headOfTrainingQuery);
                        const hot = hotSnapshot.empty ? null : hotSnapshot.docs[0].data() as User;
                        
                        const instructorQuery = query(collection(db, `companies/${companyId}/users`), where('name', '==', student.instructor));
                        const instructorSnapshot = await getDocs(instructorQuery);
                        const instructor = instructorSnapshot.empty ? null : instructorSnapshot.docs[0].data() as User;

                        const targetUserIds = [hot?.id, instructor?.id].filter(Boolean) as string[];

                        for (const targetId of targetUserIds) {
                            const newAlert: Omit<Alert, 'id'|'number'> = {
                                companyId: companyId,
                                type: 'Task',
                                title: `Milestone Alert: ${student.name}`,
                                description: `${student.name} has reached the ${milestone}-hour milestone with ${calculatedHours.toFixed(1)} total hours. Please schedule a progress check.`,
                                author: 'System',
                                date: new Date().toISOString(),
                                readBy: [],
                                targetUserId: targetId,
                                relatedLink: `/students/${student.id}`,
                            };
                            const alertsCollection = collection(db, `companies/${companyId}/alerts`);
                            await addDoc(alertsCollection, newAlert);
                        }
                        
                        batch.update(studentRef, { milestoneNotificationsSent: arrayUnion(milestone) });
                    }
                }
            }
        }

        if (writesToPerform) {
            await batch.commit();
        }

        return { bookings: bookingsWithChecklistData, aircraft, users };
    } catch (error) {
        console.error("Failed to fetch reports page data:", error);
        return { bookings: [], aircraft: [], users: [] };
    }
}
