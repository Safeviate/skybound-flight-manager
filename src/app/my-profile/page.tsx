'use client';

import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

function MyProfilePage() {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </main>
        );
    }

  return (
      <main className="flex-1 p-4 md:p-8 space-y-8">
        {/* Page content will be added here */}
      </main>
  );
}

MyProfilePage.title = 'My Profile';
export default MyProfilePage;
