'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewAircraftForm } from './new-aircraft-form';
import type { Aircraft } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAircraftPageData } from './data';
import { getNextService } from '@/lib/utils';


export function AircraftPageContent({ initialAircraft }: { initialAircraft: Aircraft[] }) {
    const [aircraftList, setAircraftList] = useState<Aircraft[]>(initialAircraft);
    const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
    const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
    const { user, company, loading } = useUser();
    const { toast } = useToast();

    const refreshData = useCallback(async () => {
        if (!company) return;
        const data = await getAircraftPageData(company.id);
        setAircraftList(data);
    }, [company]);
    
    useEffect(() => {
        if (company) {
            refreshData();
        }
    }, [company, refreshData]);

    const handleSuccess = () => {
        setIsNewAircraftDialogOpen(false);
        setEditingAircraft(null);
        refreshData();
    };

    const openNewDialog = () => {
        setEditingAircraft(null);
        setIsNewAircraftDialogOpen(true);
    }
    
    const getStatusVariant = (status: Aircraft['status']) => {
        switch (status) {
            case 'Available': return 'success';
            case 'Booked': return 'warning';
            case 'In Maintenance': return 'destructive';
            default: return 'outline';
        }
    };

  return (
    <main className="flex-1 p-4 md:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1">
                <CardTitle>Manage Fleet</CardTitle>
                <CardDescription>View and manage all aircraft in your fleet.</CardDescription>
            </div>
            <Button onClick={openNewDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Aircraft
            </Button>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Registration</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Next Service</TableHead>
                        <TableHead>Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {aircraftList.map((aircraft) => {
                        const nextService = getNextService(aircraft.hours);
                        return (
                        <TableRow key={aircraft.id}>
                            <TableCell className="font-medium">{aircraft.tailNumber}</TableCell>
                            <TableCell>{aircraft.make} {aircraft.model}</TableCell>
                            <TableCell>{aircraft.hours.toFixed(1)}</TableCell>
                            <TableCell>{nextService.type} in {nextService.hoursUntil.toFixed(1)} hrs</TableCell>
                            <TableCell>
                                <Badge variant={getStatusVariant(aircraft.status)}>{aircraft.status}</Badge>
                            </TableCell>
                        </TableRow>
                    )})}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
      <Dialog open={isNewAircraftDialogOpen} onOpenChange={setIsNewAircraftDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                  <DialogTitle>{editingAircraft ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle>
                  <DialogDescription>
                      {editingAircraft ? 'Update the details for this aircraft.' : 'Fill out the form below to add a new aircraft to the fleet.'}
                  </DialogDescription>
              </DialogHeader>
              <NewAircraftForm onSuccess={handleSuccess} initialData={editingAircraft} />
          </DialogContent>
        </Dialog>
    </main>
  );
}
