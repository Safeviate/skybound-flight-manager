
import { getBookingsPageData } from './data';
import { BookingsPageContent } from './bookings-page-content';

export default async function BookingsPageContainer() {
    const companyId = 'skybound-aero';
    const { bookingsList, aircraftList } = await getBookingsPageData(companyId);
    
    return <BookingsPageContent initialBookings={bookingsList} initialAircraft={aircraftList} />
}

BookingsPageContainer.title = 'Aircraft Bookings';
