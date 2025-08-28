
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
        const studentUserRef = doc(db, `companies/${companyId}/students`, userId);
        const studentUserSnap = await getDoc(studentUserRef);
        if (!studentUserSnap.exists()) {
            console.error("Dashboard: Could not find user to fetch data.");
            return { upcomingBookings: [], allUserBookings: [], openSafetyReports: [], openQualityAudits: [], assignedStudents: [] };
        }
        userSnap = studentUserSnap;
    }
    const user = userSnap.data() as User;
    const userName = user.name;

    const today = format(startOfToday(), 'yyyy-MM-dd');

    const upcomingBookingsAsStudentQuery = query(
        collection(db, `companies/${companyId}/bookings`),
        where('date', '>=', today),
        where('student', '==', userName)
    );
    const upcomingBookingsAsInstructorQuery = query(
        collection(db, `companies/${companyId}/bookings`),
        where('date', '>=', today),
        where('instructor', '==', userName)
    );

    const allBookingsAsStudentQuery = query(
        collection(db, `companies/${companyId}/bookings`),
        where('student', '==', userName)
    );
    const allBookingsAsInstructorQuery = query(
        collection(db, `companies/${companyId}/bookings`),
        where('instructor', '==', userName)
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
        allStudentBookingsSnap,
        allInstructorBookingsSnap,
        openSafetyReportsSnapshot,
        openQualityAuditsSnapshot,
        assignedStudentsSnapshot,
    ] = await Promise.all([
        getDocs(upcomingBookingsAsStudentQuery),
        getDocs(upcomingBookingsAsInstructorQuery),
        getDocs(allBookingsAsStudentQuery),
        getDocs(allBookingsAsInstructorQuery),
        user.permissions.includes('Safety:View') ? getDocs(openSafetyReportsQuery) : Promise.resolve({ docs: [] }),
        user.permissions.includes('Quality:View') ? getDocs(openQualityAuditsQuery) : Promise.resolve({ docs: [] }),
        user.role.includes('Instructor') || user.role === 'Chief Flight Instructor' || user.role === 'Head Of Training' ? getDocs(assignedStudentsQuery) : Promise.resolve({ docs: [] }),
    ]);

    const upcomingStudentBookings = upcomingStudentBookingsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    const upcomingInstructorBookings = upcomingInstructorBookingsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    const allUpcomingBookings = [...upcomingStudentBookings, ...upcomingInstructorBookings];
    const uniqueUpcomingBookings = Array.from(new Map(allUpcomingBookings.map(item => [item['id'], item])).values());
    uniqueUpcomingBookings.sort((a,b) => {
        const dateComparison = a.date.localeCompare(b.date);
        if (dateComparison !== 0) return dateComparison;
        return a.startTime.localeCompare(b.startTime);
    });

    const allStudentBookings = allStudentBookingsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    const allInstructorBookings = allInstructorBookingsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
    const allUserBookings = [...allStudentBookings, ...allInstructorBookings];
    const uniqueAllUserBookings = Array.from(new Map(allUserBookings.map(item => [item['id'], item])).values());

    const openSafetyReports = openSafetyReportsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SafetyReport));
    const openQualityAudits = openQualityAuditsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as QualityAudit));
    const assignedStudents = assignedStudentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
    
    return { 
        upcomingBookings: uniqueUpcomingBookings.slice(0, 5), 
        allUserBookings: uniqueAllUserBookings, 
        openSafetyReports, 
        openQualityAudits, 
        assignedStudents 
    };
}
