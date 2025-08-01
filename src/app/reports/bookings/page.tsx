
import { getBookingsPageData } from './data';
import { BookingsPageContent } from './bookings-page-content';
import type { Booking } from '@/lib/types';
import { cookies } from 'next/headers';

async function getInitialData(companyId: string): Promise<Booking[]> {
    if (!companyId) return [];
    try {
        return await getBookingsPageData(companyId);
    } catch (error) {
        console.error("Failed to fetch initial data for bookings page:", error);
        return [];
    }
}

export default async function BookingsPage() {
    const cookieStore = cookies();
    const companyId = cookieStore.get('skybound_last_company_id')?.value || 'skybound-aero';
    const initialBookings = await getInitialData(companyId);
    
    return <BookingsPageContent initialBookings={initialBookings} />;
}

BookingsPage.title = "Bookings Log";
