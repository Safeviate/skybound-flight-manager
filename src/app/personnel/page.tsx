
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';

function PersonnelPage() {
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
        <Card>
          <CardHeader>
              <CardTitle>Personnel Roster</CardTitle>
              <CardDescription>A list of all non-student personnel in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Content will be rebuilt here */}
          </CardContent>
        </Card>
      </main>
  );
}

PersonnelPage.title = 'Personnel Management';
export default PersonnelPage;
