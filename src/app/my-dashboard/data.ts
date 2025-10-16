
'use server';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, and, or, doc, getDoc } from 'firebase/firestore';
import type { Booking, User, SafetyReport, QualityAudit } from '@/lib/types';
import { format, startOfToday, startOfWeek, startOfMonth, endOfDay, parseISO } from 'date-fns';

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
    let userLocationType: 'users' | 'students' | null = null;

    for (const coll of userCollections) {
        const userDocRef = doc(db, `companies/${companyId}/${coll}`, userId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            userSnap = docSnap;
            userLocationType = coll as 'users' | 'students';
            break;
        }
    }
    
    if (!userSnap || !userLocationType) {
        console.error("Dashboard: Could not find user to fetch data.");
        return { upcomingBookings: [], allUserBookings: [], openSafetyReports: [], openQualityAudits: [], assignedStudents: [] };
    }
    const user = userSnap.data() as User;
    const userName = user.name;

    const today = format(startOfToday(), 'yyyy-MM-dd');

    // Queries for upcoming bookings for the user
    const upcomingStudentBookingsQuery = query(
      collection(db, `companies/${companyId}/aircraft-bookings`),
      where('date', '>=', today),
      where('student', '==', userName),
      orderBy('date'),
      orderBy('startTime')
    );

    const upcomingInstructorBookingsQuery = query(
      collection(db, `companies/${companyId}/aircraft-bookings`),
      where('date', '>=', today),
      where('instructor', '==', userName),
      orderBy('date'),
      orderBy('startTime')
    );
    
    const allUserBookingsQuery = query(
      collection(db, `companies/${companyId}/aircraft-bookings`),
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
        upcomingStudentBookingsSnap,
        upcomingInstructorBookingsSnap,
        allUserBookingsSnap,
        openSafetyReportsSnapshot,
        openQualityAuditsSnapshot,
        assignedStudentsSnapshot,
    ] = await Promise.all([
        getDocs(upcomingStudentBookingsQuery),
        getDocs(upcomingInstructorBookingsQuery),
        getDocs(allUserBookingsQuery), // Fetch all user bookings
        user.permissions.includes('Safety:View') ? getDocs(openSafetyReportsQuery) : Promise.resolve({ docs: [] }),
        user.permissions.includes('Quality:View') ? getDocs(openQualityAuditsQuery) : Promise.resolve({ docs: [] }),
        user.role.includes('Instructor') || user.role === 'Chief Flight Instructor' || user.role === 'Head Of Training' ? getDocs(assignedStudentsQuery) : Promise.resolve({ docs: [] }),
    ]);

    const studentBookings = upcomingStudentBookingsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    const instructorBookings = upcomingInstructorBookingsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    
    // Merge and de-duplicate the upcoming bookings
    const upcomingBookingsMap = new Map<string, Booking>();
    studentBookings.forEach(b => upcomingBookingsMap.set(b.id, b));
    instructorBookings.forEach(b => upcomingBookingsMap.set(b.id, b));
    const upcomingBookings = Array.from(upcomingBookingsMap.values()).sort((a,b) => {
        const dateA = parseISO(a.date + 'T' + a.startTime);
        const dateB = parseISO(b.date + 'T' + b.startTime);
        return dateA.getTime() - dateB.getTime();
    });
    
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
