
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import type { Aircraft } from '@/lib/types';
import { getExpiryBadge } from '@/lib/utils.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewAircraftForm } from './new-aircraft-form';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, setDoc, addDoc } from 'firebase/firestore';
import { useSettings } from '@/context/settings-provider';
import { getAircraftPageData } from './data';

export function AircraftPageContent({ initialAircraft }: { initialAircraft: Aircraft[] }) {
    const { user, company, loading } = useUser();
    const { settings } = useSettings();
    const router = useRouter();
    const [aircraft, setAircraft] = useState<Aircraft[]>(initialAircraft);
    const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
    const { toast } = useToast();

    const canEdit = user?.permissions.includes('Super User') || user?.permissions.includes('Aircraft:Edit');

    const refreshData = async () => {
        if (!company) return;
        const data = await getAircraftPageData(company.id);
        setAircraft(data);
    };

    const handleNewAircraft = async (data: Omit<Aircraft, 'id' | 'companyId'>) => {
        if (!company) return;

        const newAircraft = {
            ...data,
            companyId: company.id,
            status: 'Available',
            location: 'KPAO', // Default for now
        };

        try {
            const newDocRef = doc(collection(db, 'temp')).id;
            const aircraftRef = doc(db, `companies/${company.id}/aircraft`, newDocRef);
            await setDoc(aircraftRef, { ...newAircraft, id: newDocRef });
            
            toast({
                title: 'Aircraft Added',
                description: `${data.make} ${data.model} (${data.tailNumber}) has been added to the fleet.`,
            });
            setIsNewAircraftDialogOpen(false);
            refreshData(); // Refresh the list
        } catch (error) {
            console.error("Error adding new aircraft:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add new aircraft.' });
        }
    };

    return (
        <main className="flex-1 p-4 md:p-8 space-y-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle>Manage Fleet</CardTitle>
                        <CardDescription>Add new aircraft to the fleet.</CardDescription>
                    </div>
                    {canEdit && (
                        <Dialog open={isNewAircraftDialogOpen} onOpenChange={setIsNewAircraftDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Add Aircraft
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Add New Aircraft</DialogTitle>
                                    <DialogDescription>
                                        Fill out the form below to add a new aircraft to the fleet.
                                    </DialogDescription>
                                </DialogHeader>
                                <NewAircraftForm onSuccess={() => {
                                    setIsNewAircraftDialogOpen(false);
                                    refreshData();
                                }} />
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Registration</TableHead>
                                <TableHead>Aircraft</TableHead>
                                <TableHead>Hours</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Airworthiness</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {aircraft.map((ac) => (
                                <TableRow key={ac.id}>
                                    <TableCell className="font-medium">{ac.tailNumber}</TableCell>
                                    <TableCell>{ac.make} {ac.model}</TableCell>
                                    <TableCell>{ac.hours.toFixed(1)}</TableCell>
                                    <TableCell>{ac.status}</TableCell>
                                    <TableCell>{getExpiryBadge(ac.airworthinessExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </main>
    );
}
