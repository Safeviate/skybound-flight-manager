
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, and, or, doc, getDoc } from 'firebase/firestore';
import type { Booking, User, SafetyReport, QualityAudit } from '@/lib/types';
import { format, startOfToday, startOfWeek, startOfMonth, endOfDay } from 'date-fns';

export async function getDashboardData(companyId: string, userId: string): Promise<{ 
    upcomingBookings: Booking[],
    allUserBookings: Booking[],
    openSafetyReports: SafetyReport[],
    openQualityAudits: QualityAudit[],
    assignedStudents: User[],
}> {
    if (!companyId || !userId) {
        return { upcomingBookings: [], allUserBookings: [], openSafetyReports: [], openQualityAudits: [], assignedStudents: [] };
    }
    
    const userCollections = ['users', 'students'];
    let userSnap: import('firebase/firestore').DocumentSnapshot | null = null;

    for (const coll of userCollections) {
        const userDocRef = doc(db, `companies/${companyId}/${coll}`, userId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            userSnap = docSnap;
            break;
        }
    }
    
    if (!userSnap) {
        console.error("Dashboard: Could not find user to fetch data.");
        return { upcomingBookings: [], allUserBookings: [], openSafetyReports: [], openQualityAudits: [], assignedStudents: [] };
    }
    const user = userSnap.data() as User;
    const userName = user.name;

    const today = format(startOfToday(), 'yyyy-MM-dd');

    const upcomingBookingsQuery = query(
      collection(db, `companies/${companyId}/bookings`),
      and(
        where('date', '>=', today),
        or(
          where('student', '==', userName),
          where('instructor', '==', userName)
        )
      ),
      orderBy('date'),
      orderBy('startTime')
    );

    const allUserBookingsQuery = query(
      collection(db, `companies/${companyId}/bookings`),
      or(
        where('student', '==', userName),
        where('instructor', '==', userName)
      )
    );

    const openSafetyReportsQuery = query(
        collection(db, `companies/${companyId}/safety-reports`),
        where('status', '!=', 'Closed')
    );

    const openQualityAuditsQuery = query(
        collection(db, `companies/${companyId}/quality-audits`),
        where('status', '!=', 'Closed')
    );
    
    const assignedStudentsQuery = query(
        collection(db, `companies/${companyId}/students`),
        where('instructor', '==', userName)
    );

    const [
        upcomingBookingsSnap,
        allUserBookingsSnap,
        openSafetyReportsSnapshot,
        openQualityAuditsSnapshot,
        assignedStudentsSnapshot,
    ] = await Promise.all([
        getDocs(upcomingBookingsQuery),
        getDocs(allUserBookingsQuery),
        user.permissions.includes('Safety:View') ? getDocs(openSafetyReportsQuery) : Promise.resolve({ docs: [] }),
        user.permissions.includes('Quality:View') ? getDocs(openQualityAuditsQuery) : Promise.resolve({ docs: [] }),
        user.role.includes('Instructor') || user.role === 'Chief Flight Instructor' || user.role === 'Head Of Training' ? getDocs(assignedStudentsQuery) : Promise.resolve({ docs: [] }),
    ]);

    const upcomingBookings = upcomingBookingsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    
    const allUserBookings = allUserBookingsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));

    const openSafetyReports = openSafetyReportsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SafetyReport));
    const openQualityAudits = openQualityAuditsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as QualityAudit));
    const assignedStudents = assignedStudentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
    
    return { 
        upcomingBookings: upcomingBookings.slice(0, 5), 
        allUserBookings, 
        openSafetyReports, 
        openQualityAudits, 
        assignedStudents 
    };
}
