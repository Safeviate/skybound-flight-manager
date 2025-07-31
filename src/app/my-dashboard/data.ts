
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, or } from 'firebase/firestore';
import { format } from 'date-fns';
import type { Booking, User } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';

export async function getDashboardData(companyId: string, userId: string) {
    
    const userRef = doc(db, `companies/${companyId}/users`, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        return { bookingsList: [] };
    }

    const user = userSnap.data() as User;
    
    const bookingsQuery = query(
        collection(db, `companies/${companyId}/bookings`),
        or(
            where('student', '==', user.name),
            where('instructor', '==', user.name)
        ),
        where('date', '>=', format(new Date(), 'yyyy-MM-dd')),
        orderBy('date'),
        orderBy('startTime')
    );
    
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookingsList = bookingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
    
    return { bookingsList };
}
