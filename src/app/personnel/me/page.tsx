
'use client';

import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { User, Booking } from '@/lib/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MyProfilePageContent } from './my-profile-page-content';

function MyProfilePage() {
    const { user, company, loading: userLoading } = useUser();
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        if (!userLoading && !user) {
            router.push('/login');
        }
    }, [user, userLoading, router]);

    useEffect(() => {
        const fetchBookings = async () => {
            if (!company || !user) return;
            setLoading(true);
            try {
                const bookingsQuery = query(collection(db, `companies/${company.id}/aircraft-bookings`), where('instructor', '==', user.name));
                const snapshot = await getDocs(bookingsQuery);
                setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
            } catch (error) {
                console.error("Failed to fetch instructor bookings:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user && company) {
            fetchBookings();
        }
    }, [user, company]);


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
