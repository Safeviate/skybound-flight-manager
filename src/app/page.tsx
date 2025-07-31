

import { collection, getDocs, getCountFromServer, query, where, Timestamp, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Company, SafetyReport, User } from '@/lib/types';
import { CompaniesPageContent } from '@/app/companies-page-content';
import Loading from './loading';
import { cookies } from 'next/headers';
import { MyDashboardPageContent } from './my-dashboard/my-dashboard-page-content';
import { getDashboardData } from './my-dashboard/data';


interface CompanyWithStats extends Company {
  userCount: number;
  aircraftCount: number;
  openSafetyReports: number;
  lastBookingDate?: string;
}

async function fetchStatsForCompany(companyId: string): Promise<Omit<CompanyWithStats, keyof Company>> {
    try {
      const usersRef = collection(db, `companies/${companyId}/users`);
      const aircraftRef = collection(db, `companies/${companyId}/aircraft`);
      const safetyReportsRef = collection(db, `companies/${companyId}/safety-reports`);
      const openSafetyReportsQuery = query(safetyReportsRef, where('status', '!=', 'Closed'));
      
      const bookingsRef = collection(db, `companies/${companyId}/bookings`);
      const lastBookingQuery = query(bookingsRef, orderBy('date', 'desc'), limit(1));

      const [userSnapshot, aircraftSnapshot, openReportsSnapshot, lastBookingSnapshot] = await Promise.all([
        getCountFromServer(usersRef),
        getCountFromServer(aircraftRef),
        getCountFromServer(openSafetyReportsQuery),
        getDocs(lastBookingQuery),
      ]);
      
      let lastBookingDate: string | undefined = undefined;
      if (!lastBookingSnapshot.empty) {
        lastBookingDate = lastBookingSnapshot.docs[0].data().date as string;
      }

      return {
        userCount: userSnapshot.data().count,
        aircraftCount: aircraftSnapshot.data().count,
        openSafetyReports: openReportsSnapshot.data().count,
        lastBookingDate: lastBookingDate,
      };
    } catch (e) {
      console.error(`Failed to fetch stats for company ${companyId}`, e);
      return { userCount: 0, aircraftCount: 0, openSafetyReports: 0 };
    }
}

async function getCompaniesData() {
    try {
        const companiesCol = collection(db, 'companies');
        const companySnapshot = await getDocs(companiesCol);
        const companyList = companySnapshot.docs.map(doc => doc.data() as Company);
        
        const companiesWithStats = await Promise.all(
            companyList.map(async (company) => {
            const stats = await fetchStatsForCompany(company.id);
            return { ...company, ...stats };
            })
        );
        return companiesWithStats;
    } catch (e) {
        console.error("Error fetching companies: ", e);
        return [];
    }
}

async function getInitialDashboardData() {
    const cookieStore = cookies();
    const companyIdCookie = cookieStore.get('skybound_last_company_id');
    const userIdCookie = cookieStore.get('skybound_last_user_id');
    const companyId = companyIdCookie?.value;
    const userId = userIdCookie?.value;

    if (!companyId || !userId) {
        return { upcomingBookings: [] };
    }

    try {
        const { bookingsList } = await getDashboardData(companyId, userId);
        return { upcomingBookings: bookingsList };
    } catch (error) {
        console.error("Failed to fetch initial data for dashboard:", error);
        return { upcomingBookings: [] };
    }
}


export default async function Page() {
    const cookieStore = cookies();
    const userId = cookieStore.get('skybound_last_user_id')?.value;
    const companyId = cookieStore.get('skybound_last_company_id')?.value;

    if (userId && companyId) {
        const userRef = doc(db, 'companies', companyId, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const user = userSnap.data() as User;
            if (user.permissions.includes('Super User')) {
                 const initialCompanies = await getCompaniesData();
                 return <CompaniesPageContent initialCompanies={initialCompanies} />;
            }
        }
    }
    
    // Default to showing the user dashboard if not a super user or if data is missing
    const { upcomingBookings } = await getInitialDashboardData();
    return <MyDashboardPageContent initialBookings={upcomingBookings} />;
}
