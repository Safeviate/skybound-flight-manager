
import { FleetTrackPageContent } from './fleet-track-page-content';
import { getFleetTrackPageData } from './data';
import type { User } from '@/lib/types';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function getCompanyData(companyId: string) {
    if (!companyId) return { aircraft: [] };

    const aircraftQuery = collection(db, `companies/${companyId}/aircraft`);
    const aircraftSnapshot = await getDocs(aircraftQuery);
    const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as User));

    return { aircraft };
}

export default async function FleetTrackPage() {
    // This is a server component, so we can securely access process.env here.
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    
    // In a real scenario with authentication, we'd get the user/company from the request headers or session.
    // For now, we will assume a hardcoded companyId to fetch data.
    const companyId = 'skybound-aero'; 
    const { aircraft } = await getCompanyData(companyId);

    return <FleetTrackPageContent 
            initialAircraft={aircraft}
            googleMapsApiKey={googleMapsApiKey}
         />;
}

FleetTrackPage.title = "Fleet Track";
