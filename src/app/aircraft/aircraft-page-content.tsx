

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Archive, RotateCw, Plane } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewAircraftForm } from './new-aircraft-form';
import type { Aircraft } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { getAircraftPageData } from './data';
import { getExpiryBadge, cn } from '@/lib/utils';
import { useSettings } from '@/context/settings-provider';
import { PreFlightChecklistForm } from '@/app/checklists/pre-flight-checklist-form';
import { PostFlightChecklistForm } from '../checklists/post-flight-checklist-form';
import { ChecklistStarter } from './checklist-starter';

export function AircraftPageContent({ initialAircraft }: { initialAircraft: Aircraft[] }) {
    const [aircraftList, setAircraftList] = useState<Aircraft[]>(initialAircraft);
    const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
    const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
    const { user, company, loading } = useUser();
    const { toast } = useToast();
    const { settings } = useSettings();
    const [selectedChecklistAircraftId, setSelectedChecklistAircraftId] = useState<string | null>(null);

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

    const activeAircraft = useMemo(() => aircraftList.filter(a => a.status !== 'Archived'), [aircraftList]);
    const archivedAircraft = useMemo(() => aircraftList.filter(a => a.status === 'Archived'), [aircraftList]);
    
    const selectedAircraftForChecklist = useMemo(() => {
        if (!selectedChecklistAircraftId) return null;
        return activeAircraft.find(ac => ac.id === selectedChecklistAircraftId);
    }, [activeAircraft, selectedChecklistAircraftId]);

    const handleSuccess = () => {
        setIsNewAircraftDialogOpen(false);
        setEditingAircraft(null);
        refreshData();
    };
    
    const handleEdit = (aircraft: Aircraft) => {
        setEditingAircraft(aircraft);
        setIsNewAircraftDialogOpen(true);
    };

    const handleArchive = async (aircraft: Aircraft) => {
        if (!company) return;
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        try {
            await updateDoc(aircraftRef, { status: 'Archived' });
            toast({
                title: 'Aircraft Archived',
                description: `${aircraft.tailNumber} has been moved to the archives.`,
            });
            refreshData();
        } catch (error) {
            console.error("Error archiving aircraft:", error);
            toast({
                variant: 'destructive',
                title: 'Archiving Failed',
                description: 'Could not archive the aircraft.',
            });
        }
    };
    
    const handleRestore = async (aircraft: Aircraft) => {
        if (!company) return;
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        try {
            await updateDoc(aircraftRef, { status: 'Available' });
            toast({
                title: 'Aircraft Restored',
                description: `${aircraft.tailNumber} has been restored to the active fleet.`,
            });
            refreshData();
        } catch (error) {
            console.error("Error restoring aircraft:", error);
            toast({
                variant: 'destructive',
                title: 'Restoring Failed',
                description: 'Could not restore the aircraft.',
            });
        }
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
            case 'Archived': return 'secondary';
            default: return 'outline';
        }
    };
    
    const handleChecklistSuccess = async (newStatus: Aircraft['checklistStatus']) => {
        if (!selectedAircraftForChecklist || !company) return;
        
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, selectedAircraftForChecklist.id);
        
        try {
            await updateDoc(aircraftRef, { checklistStatus: newStatus });
            refreshData(); // Refresh the list to get the updated status
            toast({
                title: 'Checklist Submitted',
                description: `The aircraft is now ready for its ${newStatus === 'needs-post-flight' ? 'Post-Flight' : 'Pre-Flight'} check.`
            });
             setSelectedChecklistAircraftId(null);
        } catch (error) {
            console.error("Error updating checklist status:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update checklist status.' });
        }
    };
    
    const handleAircraftSelected = (aircraftId: string | null) => {
        setSelectedChecklistAircraftId(aircraftId);
    };

    const AircraftTable = ({ aircraft, isArchived }: { aircraft: Aircraft[], isArchived?: boolean }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Registration</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Airworthiness</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {aircraft.map((ac) => {
                    return (
                    <TableRow key={ac.id} className={cn(isArchived && 'text-muted-foreground')}>
                        <TableCell className="font-medium">{ac.tailNumber}</TableCell>
                        <TableCell>{ac.make} {ac.model}</TableCell>
                        <TableCell>{ac.hours.toFixed(1)}</TableCell>
                        <TableCell>{getExpiryBadge(ac.airworthinessExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}</TableCell>
                        <TableCell>{getExpiryBadge(ac.insuranceExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}</TableCell>
                        <TableCell>
                            <Badge variant={getStatusVariant(ac.status)}>{ac.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                   <Button variant="ghost" size="icon" disabled={isArchived}>
                                       <MoreHorizontal className="h-4 w-4" />
                                   </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent>
                                {isArchived ? (
                                    <DropdownMenuItem onClick={() => handleRestore(ac)}>
                                        <RotateCw className="mr-2 h-4 w-4" />
                                        Restore
                                    </DropdownMenuItem>
                                ) : (
                                    <>
                                        <DropdownMenuItem onClick={() => handleEdit(ac)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                        <Archive className="mr-2 h-4 w-4" />
                                                        Archive
                                                    </DropdownMenuItem>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will archive the aircraft "{ac.tailNumber}". It will be hidden from the active list but can be restored later.
                                                        </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleArchive(ac)}>Yes, archive aircraft</AlertDialogAction>
                                                    </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </>
                                )}
                               </DropdownMenuContent>
                           </DropdownMenu>
                        </TableCell>
                    </TableRow>
                )})}
            </TableBody>
        </Table>
    );

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
            <Tabs defaultValue="active">
                <TabsList>
                    <TabsTrigger value="active">Active Fleet</TabsTrigger>
                    <TabsTrigger value="archived">Archived</TabsTrigger>
                    <TabsTrigger value="checklists">Aircraft Checklist</TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                    <AircraftTable aircraft={activeAircraft} />
                </TabsContent>
                <TabsContent value="archived">
                     <AircraftTable aircraft={archivedAircraft} isArchived />
                </TabsContent>
                <TabsContent value="checklists" className="pt-6">
                    <div className="max-w-2xl mx-auto space-y-6">
                        {!selectedAircraftForChecklist ? (
                            <ChecklistStarter 
                                aircraftList={activeAircraft} 
                                onAircraftSelected={handleAircraftSelected} 
                            />
                        ) : (
                            <>
                                {selectedAircraftForChecklist.checklistStatus === 'needs-post-flight' ? (
                                    <PostFlightChecklistForm 
                                        onSuccess={() => handleChecklistSuccess('needs-pre-flight')}
                                        aircraft={selectedAircraftForChecklist}
                                    />
                                ) : (
                                    <PreFlightChecklistForm 
                                        onSuccess={() => handleChecklistSuccess('needs-post-flight')} 
                                        aircraft={selectedAircraftForChecklist}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
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
