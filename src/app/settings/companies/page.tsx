
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Repeat, Building, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, deleteDoc, getDoc, writeBatch, collection, addDoc, setDoc } from 'firebase/firestore';
import type { Company, Feature, User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ROLE_PERMISSIONS } from '@/lib/types';
import Link from 'next/link';
import { getCompaniesPageData } from './data';
import { CompaniesPageContent } from './companies-page-content';

function CompaniesPageContainer() {
    const { user } = useUser();
    const [initialCompanies, setInitialCompanies] = React.useState<Company[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        async function loadData() {
            if (user) {
                setLoading(true);
                const companies = await getCompaniesPageData();
                setInitialCompanies(companies);
                setLoading(false);
            }
        }
        loadData();
    }, [user]);

    if (loading) {
        return <div className="flex-1 flex items-center justify-center"><p>Loading companies...</p></div>;
    }

    return <CompaniesPageContent initialCompanies={initialCompanies} />;
}

CompaniesPageContainer.title = "Manage Companies";

export default CompaniesPageContainer;
