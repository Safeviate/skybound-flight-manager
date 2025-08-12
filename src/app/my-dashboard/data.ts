
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
    
    const userRef = doc(db, `companies/${companyId}/users`, userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
        console.error("Dashboard: Could not find user to fetch data.");
        return { upcomingBookings: [], allUserBookings: [], openSafetyReports: [], openQualityAudits: [], assignedStudents: [] };
    }
    const user = userSnap.data() as User;
    const userName = user.name;

    const today = format(startOfToday(), 'yyyy-MM-dd');

    // Query for upcoming bookings (next 5)
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
        orderBy('startTime'),
        limit(5)
    );
    
    // Query for all bookings this month (for duty time calculation)
    const allUserBookingsQuery = query(
        collection(db, `companies/${companyId}/bookings`),
        or(
            where('student', '==', userName),
            where('instructor', '==', userName)
        )
    );

    // Query for open safety reports (for managers)
    const openSafetyReportsQuery = query(
        collection(db, `companies/${companyId}/safety-reports`),
        where('status', '!=', 'Closed')
    );

    // Query for open quality audits (for managers)
    const openQualityAuditsQuery = query(
        collection(db, `companies/${companyId}/quality-audits`),
        where('status', '!=', 'Closed')
    );
    
    // Query for assigned students (for instructors)
    const assignedStudentsQuery = query(
        collection(db, `companies/${companyId}/students`),
        where('instructor', '==', userName)
    );

    const [
        upcomingBookingsSnapshot,
        allUserBookingsSnapshot,
        openSafetyReportsSnapshot,
        openQualityAuditsSnapshot,
        assignedStudentsSnapshot,
    ] = await Promise.all([
        getDocs(upcomingBookingsQuery),
        getDocs(allUserBookingsQuery),
        user.permissions.includes('Safety:View') ? getDocs(openSafetyReportsQuery) : Promise.resolve({ docs: [] }),
        user.permissions.includes('Quality:View') ? getDocs(openQualityAuditsQuery) : Promise.resolve({ docs: [] }),
        user.role.includes('Instructor') ? getDocs(assignedStudentsQuery) : Promise.resolve({ docs: [] }),
    ]);

    const upcomingBookings = upcomingBookingsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    const allUserBookings = allUserBookingsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    const openSafetyReports = openSafetyReportsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SafetyReport));
    const openQualityAudits = openQualityAuditsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as QualityAudit));
    const assignedStudents = assignedStudentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
    
    return { upcomingBookings, allUserBookings, openSafetyReports, openQualityAudits, assignedStudents };
}
