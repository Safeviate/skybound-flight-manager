
import { AircraftPageContent } from './aircraft-page-content';
import { getAircraftPageData } from './data';
import type { Aircraft, Booking, ExternalContact, TechnicalReport } from '@/lib/types';

async function getInitialData(companyId: string): Promise<{ aircraft: Aircraft[], bookings: Booking[], contacts: ExternalContact[], technicalReports: TechnicalReport[] }> {
    try {
        return await getAircraftPageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for aircraft page:", error);
        return { aircraft: [], bookings: [], contacts: [], technicalReports: [] };
    }
}


export default async function AircraftPageContainer() {
    const companyId = 'skybound-aero';
    const { aircraft, bookings, contacts, technicalReports } = await getInitialData(companyId);

    return <AircraftPageContent 
                initialAircraft={aircraft} 
                initialBookings={bookings} 
                initialExternalContacts={contacts} 
                initialTechnicalReports={technicalReports} 
            />;
}

AircraftPageContainer.title = "Aircraft Management";
