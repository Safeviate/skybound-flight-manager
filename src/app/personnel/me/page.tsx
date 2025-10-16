

'use client';

import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import type { User, Booking } from '@/lib/types';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MyProfilePageContent } from './my-profile-page';

function MyProfilePage() {
    const { user, company, loading: userLoading } = useUser();
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
            return;
        }
        if (userLoading) {
            return;
        }

        const fetchBookings = () => {
            if (!company || !user) return () => {};
            setLoading(true);
            const bookingsQuery = query(collection(db, `companies/${company.id}/aircraft-bookings`), where('instructor', '==', user.name));
            const unsubscribe = onSnapshot(bookingsQuery, (snapshot) => {
                setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
                setLoading(false);
            }, (error) => {
                console.error("Failed to fetch instructor bookings:", error);
                setLoading(false);
            });
            return unsubscribe;
        };

        const unsubscribe = fetchBookings();

        return () => {
            if(unsubscribe) unsubscribe();
        };
    }, [user, company, userLoading, router]);


    if (userLoading || loading || !user) {
        return (
            <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
                <p>Loading profile...</p>
            </main>
        );
    }
    
    return <MyProfilePageContent user={user} bookings={bookings} />;
}

MyProfilePage.title = "My Profile";
export default MyProfilePage;
