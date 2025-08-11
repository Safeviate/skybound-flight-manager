

'use client';

import { useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import Loading from './loading';


function RootPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }
    if (user) {
        // All users, regardless of role, are now directed to their dashboard.
        // The concept of a separate "super user" company management page is removed.
        router.push('/my-dashboard');
    } else {
        router.push('/login');
    }
  }, [user, loading, router]);
  
  // Display a loading state while the redirection logic is processing.
  return <Loading />;
}

export default RootPage;
