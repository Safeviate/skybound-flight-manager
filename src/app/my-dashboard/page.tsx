
'use client';

import { MyDashboardPageContent } from './my-dashboard-page-content';
import { Loader2 } from 'lucide-react';
import { useUser } from '@/context/user-provider';

export default function MyDashboardPage() {
    const { user, loading: userLoading } = useUser();

    if (userLoading) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </main>
        );
    }
    
    return (
        <MyDashboardPageContent />
    );
}

MyDashboardPage.title = 'My Dashboard';
