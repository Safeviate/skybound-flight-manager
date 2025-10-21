
import { FleetTrackPageContent } from './fleet-track-page-content';
import { getFleetTrackPageData } from './data';

export default async function FleetTrackPage() {
    // In a real scenario, we'd get the company from an authenticated session.
    // For now, we will assume a hardcoded companyId for data fetching.
    const companyId = 'skybound-aero'; 
    const { aircraft } = await getFleetTrackPageData(companyId);

    return <FleetTrackPageContent 
            initialAircraft={aircraft}
         />;
}

FleetTrackPage.title = "Fleet Track";
