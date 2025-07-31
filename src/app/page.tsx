
import { collection, getDocs, getCountFromServer, query, where, Timestamp, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Company, SafetyReport } from '@/lib/types';
import { CompaniesPageContent } from '@/app/companies-page-content';
import Loading from './loading';

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
        // The 'date' field is stored as a 'yyyy-MM-dd' string, not a Timestamp.
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

export default async function CompaniesPageContainer() {
    const initialCompanies = await getCompaniesData();
    
    return <CompaniesPageContent initialCompanies={initialCompanies} />;
}

CompaniesPageContainer.title = 'Company Management';
