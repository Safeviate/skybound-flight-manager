
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Building, Rocket, PlusCircle, Edit, MoreHorizontal, Users, Plane, ShieldAlert, User, AlertTriangle, Activity, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewCompanyForm } from '@/app/corporate/new-company-form';
import type { Company } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { EditCompanyForm } from '@/app/settings/companies/edit-company-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { subDays, formatDistanceToNow, parseISO } from 'date-fns';
import Loading from '../loading';

// This page is now deprecated as the application is single-company.
// It is being kept for now but could be removed in the future.
// The navigation link to this page has been removed for non-super users.

export function CompaniesPageContent({ initialCompanies }: { initialCompanies: any[] }) {
  const { user, loading } = useUser();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && !user?.permissions.includes('Super User')) {
      router.push('/my-dashboard');
    }
  }, [user, loading, router]);


  if (loading) {
    return <Loading />;
  }
  
  if (!user || !user.permissions.includes('Super User')) {
      return (
        <main className="flex-1 flex items-center justify-center">
            <p>You do not have permission to view this page.</p>
        </main>
      );
  }

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
       <Card>
        <CardHeader>
            <CardTitle>Legacy Page</CardTitle>
            <CardDescription>This page for managing multiple companies is no longer in use for regular users.</CardDescription>
        </CardHeader>
        <CardContent>
            <p>Your application is now configured to operate for a single company. This page is only visible to Super Users for administrative purposes.</p>
        </CardContent>
       </Card>
    </main>
  );
}
