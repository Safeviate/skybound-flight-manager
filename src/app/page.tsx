
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
      return; // Wait until the auth state is confirmed
    }
    
    // If auth state is resolved and there is a user, go to their dashboard.
    if (user) {
        router.push('/my-dashboard');
    } else {
        // If auth state is resolved and there is no user, go to the login page.
        router.push('/login');
    }
  }, [user, loading, router]);
  
  // Display a loading state while the redirection logic is processing.
  return <Loading />;
}

export default RootPage;
