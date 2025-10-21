
import { FleetTrackPageContent } from './fleet-track-page-content';
import { getFleetTrackPageData } from './data';
import type { User, Aircraft } from '@/lib/types';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/user-provider';

async function getCompanyData(companyId: string) {
    if (!companyId) return { aircraft: [] };

    try {
        const aircraftQuery = collection(db, `companies/${companyId}/aircraft`);
        const aircraftSnapshot = await getDocs(aircraftQuery);
        const aircraft = aircraftSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as Aircraft));
        return { aircraft };
    } catch (error) {
        console.error("Failed to fetch aircraft data:", error);
        return { aircraft: [] };
    }
}

export default async function FleetTrackPage() {
    // This is a server component, so we can securely access process.env here.
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    
    // In a real scenario, we'd get the company from an authenticated session.
    // For now, we will assume a hardcoded companyId.
    const companyId = 'skybound-aero'; 
    const { aircraft } = await getCompanyData(companyId);

    return <FleetTrackPageContent 
            initialAircraft={aircraft}
            googleMapsApiKey={googleMapsApiKey}
         />;
}

FleetTrackPage.title = "Fleet Track";
