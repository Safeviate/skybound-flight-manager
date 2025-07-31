
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Archive, Trash2, RotateCw, ListChecks } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewAircraftForm } from './new-aircraft-form';
import type { Aircraft, Checklist } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, doc, updateDoc, setDoc, addDoc, getDocs, query } from 'firebase/firestore';
import { getAircraftPageData } from './data';
import { getExpiryBadge, cn } from '@/lib/utils';
import { useSettings } from '@/context/settings-provider';
import { ChecklistTemplateManager } from '../checklists/checklist-template-manager';
import { ChecklistCard } from '../checklists/checklist-card';


export function AircraftPageContent({ initialAircraft }: { initialAircraft: Aircraft[] }) {
    const [aircraftList, setAircraftList] = useState<Aircraft[]>(initialAircraft);
    const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
    const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
    const { user, company, loading } = useUser();
    const { toast } = useToast();
    const { settings } = useSettings();
    const [activeChecklist, setActiveChecklist] = useState<Checklist | null>(null);
    const [checklistTemplates, setChecklistTemplates] = useState<Checklist[]>([]);
    const [selectedAircraftForChecklist, setSelectedAircraftForChecklist] = useState<Aircraft | null>(null);


    const refreshData = useCallback(async () => {
        if (!company) return;
        const data = await getAircraftPageData(company.id);
        const templatesQuery = query(collection(db, `companies/${company.id}/checklist-templates`));
        const templatesSnapshot = await getDocs(templatesQuery);
        setChecklistTemplates(templatesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Checklist)));
        setAircraftList(data);
    }, [company]);
    
    useEffect(() => {
        if (company) {
            refreshData();
        }
    }, [company, refreshData]);

    const activeAircraft = useMemo(() => aircraftList.filter(a => a.status !== 'Archived'), [aircraftList]);
    const archivedAircraft = useMemo(() => aircraftList.filter(a => a.status === 'Archived'), [aircraftList]);

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

    const openChecklistDialog = (aircraft: Aircraft) => {
        setSelectedAircraftForChecklist(aircraft);
        const preFlightTemplate = checklistTemplates.find(t => t.category === 'Pre-Flight');
        if (preFlightTemplate) {
          setActiveChecklist(preFlightTemplate);
        } else {
            toast({ variant: 'destructive', title: 'No Pre-Flight Template', description: 'A pre-flight checklist template must be created first.'});
        }
    };
    
    const closeChecklistDialog = () => {
        setSelectedAircraftForChecklist(null);
        setActiveChecklist(null);
    }
    
    const handleChecklistItemToggle = (updatedChecklist: Checklist) => {
        setActiveChecklist(updatedChecklist);
    }
    
    const handleChecklistSubmit = async (finalChecklist: Checklist, hobbsValue?: number, reportText?: string) => {
        if (!company || !selectedAircraftForChecklist || !user) return;
        
        try {
            const completedChecklistData = {
                ...finalChecklist,
                completedBy: user.id,
                completedDate: new Date().toISOString(),
                aircraftId: selectedAircraftForChecklist.id,
                hobbsValue: hobbsValue,
                reportText: reportText,
            };
            
            await addDoc(collection(db, `companies/${company.id}/completed-checklists`), completedChecklistData);

            if(hobbsValue) {
                const aircraftRef = doc(db, `companies/${company.id}/aircraft`, selectedAircraftForChecklist.id);
                await updateDoc(aircraftRef, { hours: hobbsValue });
            }
            
            toast({
                title: 'Checklist Submitted',
                description: `The ${finalChecklist.title} for ${selectedAircraftForChecklist.tailNumber} has been saved.`,
            });
            
            closeChecklistDialog();
            refreshData();
        } catch (error) {
            console.error("Error submitting checklist:", error);
            toast({ variant: 'destructive', title: 'Submission Failed', description: 'Could not save the checklist.' });
        }
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
                                        <DropdownMenuItem onClick={() => openChecklistDialog(ac)}>
                                            <ListChecks className="mr-2 h-4 w-4" />
                                            Perform Checklist
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
                    <TabsTrigger value="checklists">Checklist Templates</TabsTrigger>
                </TabsList>
                <TabsContent value="active">
                    <AircraftTable aircraft={activeAircraft} />
                </TabsContent>
                <TabsContent value="archived">
                     <AircraftTable aircraft={archivedAircraft} isArchived />
                </TabsContent>
                <TabsContent value="checklists">
                    <ChecklistTemplateManager onUpdate={refreshData} />
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
        
        <Dialog open={!!activeChecklist} onOpenChange={closeChecklistDialog}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{activeChecklist?.title}</DialogTitle>
                    <DialogDescription>
                        For aircraft: {selectedAircraftForChecklist?.tailNumber}
                    </DialogDescription>
                </DialogHeader>
                {activeChecklist && (
                     <ChecklistCard 
                        checklist={activeChecklist}
                        aircraft={selectedAircraftForChecklist || undefined}
                        onUpdate={handleChecklistSubmit}
                    />
                )}
            </DialogContent>
        </Dialog>
    </main>
  );
}
