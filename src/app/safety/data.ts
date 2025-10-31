
'use server';

import { db } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { SafetyReport, Risk, Booking, ManagementOfChange, User, CompanyDepartment } from '@/lib/types';

export async function getSafetyPageData(companyId: string) {
    if (!companyId) {
        console.error("getSafetyPageData called without a companyId.");
        return { reportsList: [], risksList: [], bookingsList: [], mocList: [], personnelList: [], departmentsList: [] };
    }

    const reportsQuery = query(collection(db, `companies/${companyId}/safety-reports`));
    const risksQuery = query(collection(db, `companies/${companyId}/risks`));
    const bookingsQuery = query(collection(db, `companies/${companyId}/bookings`));
    const mocQuery = query(collection(db, `companies/${companyId}/management-of-change`));
    const personnelQuery = query(collection(db, `companies/${companyId}/users`));
    const departmentsQuery = query(collection(db, `companies/${companyId}/departments`));
    
    try {
        const [reportsSnapshot, risksSnapshot, bookingsSnapshot, mocSnapshot, personnelSnapshot, departmentsSnapshot] = await Promise.all([
            getDocs(reportsQuery),
            getDocs(risksQuery),
            getDocs(bookingsQuery),
            getDocs(mocQuery),
            getDocs(personnelQuery),
            getDocs(departmentsQuery),
        ]);

        const reportsList = reportsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SafetyReport));
        const risksList = risksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Risk));
        const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const mocList = mocSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ManagementOfChange));
        const personnelList = personnelSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        const departmentsList = departmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDepartment));
        
        return { reportsList, risksList, bookingsList, mocList, personnelList, departmentsList };
    } catch (error) {
        console.error(`Failed to fetch safety page data for company ${companyId}:`, error);
        return { reportsList: [], risksList: [], bookingsList: [], mocList: [], personnelList: [], departmentsList: [] };
    }
}
