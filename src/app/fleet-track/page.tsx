
import { FleetTrackPageContent } from './fleet-track-page-content';
import { getFleetTrackPageData } from './data';
import { useUser } from '@/context/user-provider';
import type { Aircraft } from '@/lib/types';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

async function getCompanyData(companyId: string) {
    if (!companyId) return { aircraft: [] };

    const aircraftQuery = collection(db, `companies/${companyId}/aircraft`);
    const aircraftSnapshot = await getDocs(aircraftQuery);
    const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));

    return { aircraft };
}

export default async function FleetTrackPage() {
    // This is a server component, so we can securely access process.env here.
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    
    // We cannot use hooks like useUser() in Server Components.
    // In a real scenario with authentication, we'd get the user/company from the request headers or session.
    // For now, we will assume a hardcoded companyId to fetch data.
    // This is a temporary measure to get the map working.
    const companyId = 'skybound-aero'; // Replace with logic to get current company if needed
    const { aircraft } = await getCompanyData(companyId);

    return <FleetTrackPageContent 
            initialAircraft={aircraft}
            googleMapsApiKey={googleMapsApiKey}
         />;
}

FleetTrackPage.title = "Fleet Track";
