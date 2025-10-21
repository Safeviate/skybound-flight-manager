
import { FleetTrackPageContent } from './fleet-track-page-content';
import { getFleetTrackPageData } from './data';

export default async function FleetTrackPage() {
    // In a real scenario, we'd get the company from an authenticated session.
    // For now, we will assume a hardcoded companyId for data fetching.
    const companyId = 'skybound-aero'; 
    const { aircraft } = await getFleetTrackPageData(companyId);
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

    return <FleetTrackPageContent 
            initialAircraft={aircraft}
            googleMapsApiKey={googleMapsApiKey}
         />;
}

FleetTrackPage.title = "Fleet Track";
