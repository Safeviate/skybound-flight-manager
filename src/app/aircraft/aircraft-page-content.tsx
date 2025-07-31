

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Archive, RotateCw, Plane, ArrowLeft, Check, Download, History, ChevronRight, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewAircraftForm } from './new-aircraft-form';
import type { Aircraft, CompletedChecklist } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, addDoc, collection, getDocs, orderBy, query, deleteDoc } from 'firebase/firestore';
import { getAircraftPageData } from './data';
import { getExpiryBadge, cn } from '@/lib/utils';
import { useSettings } from '@/context/settings-provider';
import { PreFlightChecklistForm, type PreFlightChecklistFormValues } from '@/app/checklists/pre-flight-checklist-form';
import { PostFlightChecklistForm, type PostFlightChecklistFormValues } from '../checklists/post-flight-checklist-form';
import { ChecklistStarter } from './checklist-starter';
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


async function getChecklistHistory(companyId: string, aircraftId: string): Promise<CompletedChecklist[]> {
    if (!companyId || !aircraftId) return [];
    
    const historyQuery = query(
        collection(db, `companies/${companyId}/aircraft/${aircraftId}/completed-checklists`),
        orderBy('dateCompleted', 'desc')
    );
    
    const snapshot = await getDocs(historyQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompletedChecklist));
}

export function AircraftPageContent({ initialAircraft }: { initialAircraft: Aircraft[] }) {
    const [aircraftList, setAircraftList] = useState<Aircraft[]>(initialAircraft);
    const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
    const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
    const { user, company, loading } = useUser();
    const { toast } = useToast();
    const { settings } = useSettings();
    const [selectedChecklistAircraftId, setSelectedChecklistAircraftId] = useState<string | null>(null);
    const [selectedHistoryAircraftId, setSelectedHistoryAircraftId] = useState<string | null>(null);
    const [checklistHistory, setChecklistHistory] = useState<CompletedChecklist[]>([]);
    const [viewingChecklist, setViewingChecklist] = useState<CompletedChecklist | null>(null);

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
    
    const fetchHistory = useCallback(async () => {
        if (company && selectedHistoryAircraftId) {
            const history = await getChecklistHistory(company.id, selectedHistoryAircraftId);
            setChecklistHistory(history);
        } else {
            setChecklistHistory([]);
        }
    }, [company, selectedHistoryAircraftId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);


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
    
    const handleChecklistSuccess = async (data: PreFlightChecklistFormValues | PostFlightChecklistFormValues) => {
        if (!selectedAircraftForChecklist || !company || !user) return;
        
        const isPreFlight = 'registration' in data;
        const newStatus = isPreFlight ? 'needs-post-flight' : 'needs-pre-flight';

        const historyDoc: Omit<CompletedChecklist, 'id'> = {
            aircraftId: selectedAircraftForChecklist.id,
            aircraftTailNumber: selectedAircraftForChecklist.tailNumber,
            userId: user.id,
            userName: user.name,
            dateCompleted: new Date().toISOString(),
            type: isPreFlight ? 'Pre-Flight' : 'Post-Flight',
            results: data,
        };

        try {
            // Update aircraft status
            const aircraftRef = doc(db, `companies/${company.id}/aircraft`, selectedAircraftForChecklist.id);
            await updateDoc(aircraftRef, { checklistStatus: newStatus });

            // Add to checklist history
            const historyCollectionRef = collection(db, `companies/${company.id}/aircraft/${selectedAircraftForChecklist.id}/completed-checklists`);
            await addDoc(historyCollectionRef, historyDoc);

            refreshData();
            toast({
                title: 'Checklist Submitted',
                description: `The checklist has been saved. The aircraft is now ready for its ${newStatus === 'needs-post-flight' ? 'next flight' : 'Post-Flight check'}.`
            });
             setSelectedChecklistAircraftId(null);
        } catch (error) {
            console.error("Error updating checklist status or history:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit checklist.' });
        }
    };

    const handleDeleteChecklist = async (checklistId: string) => {
        if (!company || !selectedHistoryAircraftId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete checklist without company or aircraft context.' });
            return;
        }

        const checklistRef = doc(db, `companies/${company.id}/aircraft/${selectedHistoryAircraftId}/completed-checklists`, checklistId);
        
        try {
            await deleteDoc(checklistRef);
            toast({ title: 'Checklist Deleted', description: 'The checklist history record has been removed.' });
            fetchHistory(); // Refresh the list
        } catch (error) {
            console.error("Error deleting checklist:", error);
            toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the checklist history record.' });
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
    
    const handleDownloadChecklist = (checklist: CompletedChecklist) => {
        const doc = new jsPDF();
        const { results } = checklist;
        const isPreFlight = checklist.type === 'Pre-Flight';
    
        doc.setFontSize(18);
        doc.text(`${checklist.type} Checklist: ${checklist.aircraftTailNumber}`, 14, 22);
        doc.setFontSize(10);
        doc.text(`Completed by ${checklist.userName} on ${format(parseISO(checklist.dateCompleted), 'PPP p')}`, 14, 28);
        
        let yPos = 40;
        
        const addField = (label: string, value: string | number | boolean | undefined) => {
            if (value !== undefined) {
                doc.setFont('helvetica', 'bold');
                doc.text(label, 14, yPos);
                doc.setFont('helvetica', 'normal');
                doc.text(String(value), 60, yPos);
                yPos += 7;
            }
        };
    
        if (isPreFlight) {
            const preFlightResults = results as PreFlightChecklistFormValues;
            addField('Aircraft Registration:', preFlightResults.registration);
            addField('Hobbs Hours:', preFlightResults.hobbs);
        } else {
             addField('Hobbs Hours:', (results as PostFlightChecklistFormValues).hobbs);
        }
        
        yPos += 5;
    
        const tableBody: any[][] = [];
        if (isPreFlight) {
            const preFlightResults = results as PreFlightChecklistFormValues;
            tableBody.push(['Checklist/POH Onboard', preFlightResults.checklistOnboard ? 'Yes' : 'No']);
            tableBody.push(['FOM Onboard', preFlightResults.fomOnboard ? 'Yes' : 'No']);
            tableBody.push(['Certificate of Airworthiness', preFlightResults.airworthinessOnboard ? 'Yes' : 'No']);
            tableBody.push(['Insurance', preFlightResults.insuranceOnboard ? 'Yes' : 'No']);
            tableBody.push(['Certificate of Release to Service', preFlightResults.releaseToServiceOnboard ? 'Yes' : 'No']);
            tableBody.push(['Certificate of Registration', preFlightResults.registrationOnboard ? 'Yes' : 'No']);
            tableBody.push(['Mass and Balance', preFlightResults.massAndBalanceOnboard ? 'Yes' : 'No']);
            tableBody.push(['Radio Station License', preFlightResults.radioLicenseOnboard ? 'Yes' : 'No']);
        } else {
            tableBody.push(['Defect Reported', (results.report || '').length > 0 ? 'Yes' : 'No']);
        }
    
        autoTable(doc, {
            startY: yPos,
            head: [['Item', 'Result']],
            body: tableBody,
        });
    
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Anything to Report?', 14, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        doc.text(results.report || 'Nothing reported.', 14, yPos, { maxWidth: 180 });
    
        yPos = (doc as any).lastAutoTable.finalY + 15;
        
        const addImageSection = (title: string, dataUrl: string | undefined) => {
            if (dataUrl) {
                if (yPos > 220) { // Check if new page is needed, increased threshold
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFont('helvetica', 'bold');
                doc.text(title, 14, yPos);
                yPos += 5;
                doc.addImage(dataUrl, 'JPEG', 14, yPos, 80, 45); // Using JPEG for smaller size
                yPos += 55;
            }
        };

        const preFlightResults = results as PreFlightChecklistFormValues;
        const postFlightResults = results as PostFlightChecklistFormValues;

        if (preFlightResults.leftSidePhoto) {
            addImageSection('Left Side Photo:', preFlightResults.leftSidePhoto);
        }
        if (preFlightResults.rightSidePhoto) {
            addImageSection('Right Side Photo:', preFlightResults.rightSidePhoto);
        }
        if (postFlightResults.defectPhoto) {
            addImageSection('Defect Photo:', postFlightResults.defectPhoto);
        }
        
        doc.save(`checklist_${checklist.aircraftTailNumber}_${checklist.id}.pdf`);
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
            <Tabs defaultValue="active">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="active">Active Fleet</TabsTrigger>
                    <TabsTrigger value="archived">Archived</TabsTrigger>
                    <TabsTrigger value="checklists">Aircraft Checklist</TabsTrigger>
                    <TabsTrigger value="history">Checklist History</TabsTrigger>
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
                                <div className="mb-4">
                                    <Button variant="outline" size="sm" onClick={() => handleAircraftSelected(null)}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Change Aircraft
                                    </Button>
                                </div>
                                {selectedAircraftForChecklist.checklistStatus === 'needs-post-flight' ? (
                                    <PostFlightChecklistForm 
                                        onSuccess={handleChecklistSuccess}
                                        aircraft={selectedAircraftForChecklist}
                                    />
                                ) : (
                                    <PreFlightChecklistForm 
                                        onSuccess={handleChecklistSuccess} 
                                        aircraft={selectedAircraftForChecklist}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </TabsContent>
                 <TabsContent value="history" className="pt-6">
                    <div className="max-w-2xl mx-auto space-y-4">
                        <div className="flex items-center gap-4">
                            <Plane className="h-5 w-5 text-muted-foreground" />
                            <Select onValueChange={setSelectedHistoryAircraftId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an aircraft to view its history..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {activeAircraft.map(ac => (
                                        <SelectItem key={ac.id} value={ac.id}>
                                            {ac.model} ({ac.tailNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {checklistHistory.length > 0 ? (
                            <div className="space-y-2">
                                {checklistHistory.map(item => (
                                    <Card key={item.id} className="hover:bg-muted/50">
                                        <CardContent className="p-3 flex justify-between items-center">
                                            <div onClick={() => setViewingChecklist(item)} className="cursor-pointer flex-1">
                                                <p className="font-semibold">{item.type} Checklist</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Completed by {item.userName} on {format(parseISO(item.dateCompleted), 'PPP')}
                                                </p>
                                            </div>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Checklist History?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This action cannot be undone. This will permanently delete this checklist record.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteChecklist(item.id)}>
                                                            Yes, Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                            <Button variant="ghost" size="icon" onClick={() => setViewingChecklist(item)}>
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : selectedHistoryAircraftId ? (
                             <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">No checklist history found for this aircraft.</p>
                            </div>
                        ) : null}
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
        {viewingChecklist && (
             <Dialog open={!!viewingChecklist} onOpenChange={(open) => !open && setViewingChecklist(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{viewingChecklist.type} Checklist</DialogTitle>
                        <DialogDescription>
                            Details for {viewingChecklist.aircraftTailNumber} on {format(parseISO(viewingChecklist.dateCompleted), 'PPP p')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
                        <p className="text-sm">Completed by: <span className="font-semibold">{viewingChecklist.userName}</span></p>
                        <div className="space-y-2">
                             <h4 className="font-semibold text-sm">Photos</h4>
                             <div className="grid grid-cols-2 gap-2">
                                {(viewingChecklist.results as PostFlightChecklistFormValues).leftSidePhoto && <Image src={(viewingChecklist.results as PostFlightChecklistFormValues).leftSidePhoto} alt="Left side" width={200} height={112} className="rounded-md" />}
                                {(viewingChecklist.results as PostFlightChecklistFormValues).rightSidePhoto && <Image src={(viewingChecklist.results as PostFlightChecklistFormValues).rightSidePhoto} alt="Right side" width={200} height={112} className="rounded-md" />}
                                {(viewingChecklist.results as PostFlightChecklistFormValues).defectPhoto && <Image src={(viewingChecklist.results as PostFlightChecklistFormValues).defectPhoto} alt="Defect" width={200} height={112} className="rounded-md" />}
                             </div>
                        </div>
                        <div className="space-y-2">
                             <h4 className="font-semibold text-sm">Report</h4>
                             <p className="text-sm p-2 bg-muted rounded-md">{viewingChecklist.results.report || "No issues reported."}</p>
                        </div>
                    </div>
                     <DialogFooter>
                        <Button variant="outline" onClick={() => handleDownloadChecklist(viewingChecklist)}>
                            <Download className="mr-2 h-4 w-4"/>
                            Download PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
             </Dialog>
        )}
    </main>
  );
}
