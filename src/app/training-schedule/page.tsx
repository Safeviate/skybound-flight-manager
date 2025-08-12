
import { TrainingSchedulePageContent } from './training-schedule-client';
import { getSchedulePageData } from './data';

async function getInitialData(companyId: string) {
    try {
        const data = await getSchedulePageData(companyId);
        return data || { aircraft: [], bookings: [], users: [] };
    } catch (error) {
        console.error("Failed to fetch initial data for schedule page:", error);
        return { aircraft: [], bookings: [], users: [] };
    }
}


export default async function TrainingSchedulePage() {
  const companyId = 'skybound-aero';
  const { aircraft, bookings, users } = await getInitialData(companyId);

  return <TrainingSchedulePageContent 
            initialAircraft={aircraft}
            initialBookings={bookings}
            initialUsers={users}
         />;
}

TrainingSchedulePage.title = "Training Schedule";
