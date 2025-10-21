
import { getFleetTrackPageData } from './data';
import { FleetTrackPageContent } from './fleet-track-page-content';
import { getCompaniesPageData } from '@/app/settings/companies/data';


async function FleetTrackPage() {
    // This is now a server component, so we can safely access process.env
    // The correct server-side variable is GOOGLE_MAPS_API_KEY, not the public one.
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    // We assume there's at least one company and fetch its data.
    // In a real multi-company admin setup, this would be more dynamic.
    const companies = await getCompaniesPageData();
    const companyId = companies[0]?.id;
    let initialData = { aircraft: [] };

    if (companyId) {
        initialData = await getFleetTrackPageData(companyId);
    }

    return <FleetTrackPageContent 
            initialAircraft={initialData.aircraft}
            googleMapsApiKey={googleMapsApiKey}
         />;
}

FleetTrackPage.title = "Fleet Track";

export default FleetTrackPage;
