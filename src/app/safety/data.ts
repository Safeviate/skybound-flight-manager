
import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { SafetyReport, Risk, Booking, CompletedChecklist } from '@/lib/types';

export async function getSafetyPageData(companyId: string) {
    const reportsQuery = query(collection(db, `companies/${companyId}/safety-reports`));
    const risksQuery = query(collection(db, `companies/${companyId}/risks`));
    const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
    const checklistsQuery = query(collection(db, `companies/${companyId}/completedChecklists`));

    const [reportsSnapshot, risksSnapshot, bookingsSnapshot, checklistsSnapshot] = await Promise.all([
        getDocs(reportsQuery),
        getDocs(risksQuery),
        getDocs(bookingsQuery),
        getDocs(checklistsQuery),
    ]);

    const reportsList = reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SafetyReport));
    const risksList = risksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Risk));
    const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    const checklistsList = checklistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompletedChecklist));
    
    return { reportsList, risksList, bookingsList, checklistsList };
}
