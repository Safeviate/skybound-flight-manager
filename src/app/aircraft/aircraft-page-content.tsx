
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Archive, RotateCw, Plane, Eye, Trash2, Check, ListChecks, Loader2, ChevronRight, Power } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewAircraftForm } from './new-aircraft-form';
import type { Aircraft, Booking } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSettings } from '@/context/settings-provider';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import Loading from '../loading';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export function AircraftPageContent() {
    const [aircraftList, setAircraftList] = useState<Aircraft[]>([]);
    const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
    const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
    const { user, company, loading: userLoading } = useUser();
    const { toast } = useToast();
    const { settings } = useSettings();
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (!userLoading && company) {
            setDataLoading(true);
            const unsubAircraft = onSnapshot(query(collection(db, `companies/${company.id}/aircraft`), orderBy('tailNumber')), (snapshot) => {
                const aircrafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
                setAircraftList(aircrafts);
                setDataLoading(false);
            }, (error) => {
                console.error("Error fetching aircraft:", error);
                setDataLoading(false);
            });
            return () => unsubAircraft();
        }
    }, [company, userLoading]);

    const activeAircraft = useMemo(() => aircraftList.filter(a => a.status !== 'Archived'), [aircraftList]);
    const archivedAircraft = useMemo(() => aircraftList.filter(a => a.status === 'Archived'), [aircraftList]);

    const handleSuccess = () => {
        setIsNewAircraftDialogOpen(false);
        setEditingAircraft(null);
    };
    
    const handleEdit = (aircraft: Aircraft) => {
        setEditingAircraft(aircraft);
        setIsNewAircraftDialogOpen(true);
    };

    const handleReturnToService = async (aircraft: Aircraft) => {
        if (!company) return;
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        await updateDoc(aircraftRef, { 
            status: 'Available',
            maintenanceStartDate: null,
            maintenanceEndDate: null,
        });
        toast({ title: 'Aircraft Returned to Service', description: `${aircraft.tailNumber} is now marked as Available.` });
    };

    const handleArchive = async (aircraft: Aircraft) => {
        if (!company) return;
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        await updateDoc(aircraftRef, { status: 'Archived' });
        toast({ title: 'Aircraft Archived', description: `${aircraft.tailNumber} has been moved to the archives.` });
    };

    const handleDelete = async (aircraftId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/aircraft`, aircraftId));
            toast({ title: 'Aircraft Deleted', description: 'The aircraft has been permanently removed.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Deletion Failed' });
        }
    };
    
    const handleRestore = async (aircraft: Aircraft) => {
        if (!company) return;
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        await updateDoc(aircraftRef, { status: 'Available' });
        toast({ title: 'Aircraft Restored', description: `${aircraft.tailNumber} has been restored.` });
    };

    const getStatusVariant = (status: Aircraft['status']) => {
        switch (status) {
            case 'Available': return 'success';
            case 'Booked': return 'warning';
            case 'In Maintenance': return 'destructive';
            case 'Archived': return 'secondary';
            default: return 'outline';
        }
    };

    const AircraftCardList = ({ aircraft, isArchived }: { aircraft: Aircraft[], isArchived?: boolean }) => {
        if (dataLoading) return <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg"><Loader2 className="mr-2 h-6 w-6 animate-spin" /><p>Loading fleet...</p></div>;
        if (aircraft.length === 0) return <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg"><p className="text-muted-foreground">No aircraft found in this category.</p></div>;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {aircraft.map((ac) => {
                    const hoursUntil50 = ac.next50HourInspection ? (ac.next50HourInspection - (ac.currentTachoReading || 0)) : -1;
                    const hoursUntil100 = ac.next100HourInspection ? (ac.next100HourInspection - (ac.currentTachoReading || 0)) : -1;

                    return (
                        <Card key={ac.id} className={cn("flex flex-col", isArchived && 'bg-muted/50')}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Plane className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle>{ac.tailNumber}</CardTitle>
                                            <CardDescription>{ac.make} {ac.model}</CardDescription>
                                        </div>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                        {isArchived ? (
                                            <>
                                                <DropdownMenuItem onClick={() => handleRestore(ac)}>
                                                    <RotateCw className="mr-2 h-4 w-4" /> Restore
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the aircraft "{ac.tailNumber}".</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(ac.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        ) : (
                                            <>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/aircraft/${ac.id}`}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Profile
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => handleEdit(ac)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                                                </DropdownMenuItem>
                                                {ac.status === 'In Maintenance' && (
                                                    <DropdownMenuItem onClick={() => handleReturnToService(ac)}>
                                                        <Check className="mr-2 h-4 w-4" /> Return to Service
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                                            <Archive className="mr-2 h-4 w-4" /> Archive
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Archive Aircraft?</AlertDialogTitle>
                                                            <AlertDialogDescription>This will hide "{ac.tailNumber}" from the active fleet. It can be restored later.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleArchive(ac)}>Archive</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                <div className="pt-2">
                                     <Badge variant={getStatusVariant(ac.status)}>{ac.status}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm flex-grow">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Hobbs</span>
                                    <span className="font-semibold">{ac.hours.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Tacho</span>
                                    <span className="font-semibold">{ac.currentTachoReading?.toFixed(1) ?? 'N/A'}</span>
                                </div>
                                <Separator />
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase">Next 50hr</p>
                                        <p className={cn("font-medium", hoursUntil50 < 5 ? "text-destructive" : "")}>
                                            {hoursUntil50 >= 0 ? `${hoursUntil50.toFixed(1)}h` : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground uppercase">Next 100hr</p>
                                        <p className={cn("font-medium", hoursUntil100 < 10 ? "text-destructive" : "")}>
                                            {hoursUntil100 >= 0 ? `${hoursUntil100.toFixed(1)}h` : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-4 border-t">
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/aircraft/${ac.id}`}>
                                        View Full Profile
                                        <ChevronRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        )
    };

  if (userLoading) return <Loading />;

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
              <h1 className="text-3xl font-bold tracking-tight">Fleet Management</h1>
              <p className="text-muted-foreground">Monitor aircraft status, maintenance, and compliance across your entire fleet.</p>
          </div>
          <Button onClick={() => { setEditingAircraft(null); setIsNewAircraftDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Aircraft
          </Button>
      </div>

      <Tabs defaultValue="active">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50">
              <TabsTrigger value="active" className="px-6">Active Fleet ({activeAircraft.length})</TabsTrigger>
              <TabsTrigger value="archived" className="px-6">Archives ({archivedAircraft.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="mt-6">
              <AircraftCardList aircraft={activeAircraft} />
          </TabsContent>
          <TabsContent value="archived" className="mt-6">
               <AircraftCardList aircraft={archivedAircraft} isArchived />
          </TabsContent>
      </Tabs>

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
