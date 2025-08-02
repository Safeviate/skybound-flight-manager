
import { CompaniesPageContent } from '@/app/companies-page-content';
import { MyDashboardPageContent } from './my-dashboard/my-dashboard-page-content';
import { useUser } from '@/context/user-provider';


// Mock data for display purposes
const mockCompanies = [
    {
        id: 'skybound-aero',
        name: 'SkyBound Aero',
        trademark: 'Excellence in Aviation',
        enabledFeatures: ['Safety', 'Quality', 'Aircraft', 'Students', 'Personnel', 'Bookings', 'AdvancedAnalytics'],
        userCount: 15,
        aircraftCount: 5,
        openSafetyReports: 2,
        lastBookingDate: new Date().toISOString(),
    }
];

export default function Page() {
    // In a standalone app, we can decide which view to show.
    // Let's default to the Companies view for the super admin,
    // and a mock dashboard for others.
    // This logic would be more complex in a real app with auth.

    return <CompaniesPageContent initialCompanies={mockCompanies} />;
}
