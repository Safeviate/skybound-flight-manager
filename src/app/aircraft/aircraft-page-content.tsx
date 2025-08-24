

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Archive, RotateCw, Plane, ArrowLeft, Check, Download, History, ChevronRight, Trash2, Mail, Eye, CheckCircle2, XCircle, AlertTriangle, Loader2, ListChecks, Wrench, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewAircraftForm } from './new-aircraft-form';
import type { Aircraft, CompletedChecklist, ExternalContact, Booking, Alert, TrainingLogEntry, User, TechnicalReport } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { cn, getExpiryBadge } from '@/lib/utils';
import { useSettings } from '@/context/settings-provider';
import { PreFlightChecklistForm, type PreFlightChecklistFormValues } from '@/app/checklists/pre-flight-checklist-form';
import { PostFlightChecklistForm, type PostFlightChecklistFormValues } from '../checklists/post-flight-checklist-form';
import { ChecklistStarter } from './checklist-starter';
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, getDocs, doc, updateDoc, writeBatch, addDoc, deleteDoc, orderBy, arrayUnion, getDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

async function getChecklistHistory(companyId: string, aircraftId: string): Promise<CompletedChecklist[]> {
    if (!companyId || !aircraftId) return [];
    const historyRef = collection(db, `companies/${companyId}/aircraft/${aircraftId}/completed-checklists`);
    const snapshot = await getDocs(historyRef);
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CompletedChecklist));
}


export function AircraftPageContent({ 
    initialAircraft,
    initialBookings,
    initialExternalContacts,
    initialTechnicalReports
}: { 
    initialAircraft: Aircraft[],
    initialBookings: Booking[],
    initialExternalContacts: ExternalContact[],
    initialTechnicalReports: TechnicalReport[],
}) {
    const [aircraftList, setAircraftList] = useState<Aircraft[]>(initialAircraft);
    const [bookings, setBookings] = useState<Booking[]>(initialBookings);
    const [externalContacts, setExternalContacts] = useState<ExternalContact[]>(initialExternalContacts);
    const [technicalReports, setTechnicalReports] = useState<TechnicalReport[]>(initialTechnicalReports);
    const [isDataLoading, setIsDataLoading] = useState(false);
    const [isNewAircraftDialogOpen, setIsNewAircraftDialogOpen] = useState(false);
    const [editingAircraft, setEditingAircraft] = useState<Aircraft | null>(null);
    const { user, company, loading: userLoading } = useUser();
    const { toast } = useToast();
    const { settings } = useSettings();
    const [selectedChecklistAircraftId, setSelectedChecklistAircraftId] = useState<string | null>(null);
    const [selectedHistoryAircraftId, setSelectedHistoryAircraftId] = useState<string | null>(null);
    const [checklistHistory, setChecklistHistory] = useState<CompletedChecklist[]>([]);
    const [viewingDocumentsForAircraft, setViewingDocumentsForAircraft] = useState<Aircraft | null>(null);
    const [viewingHistoryFor, setViewingHistoryFor] = useState<Aircraft | null>(null);
    const [viewingChecklist, setViewingChecklist] = useState<CompletedChecklist | null>(null);
    const [editingReport, setEditingReport] = useState<TechnicalReport | null>(null);
    
    useEffect(() => {
        if (!company) return;

        const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`), orderBy('tailNumber'));
        const unsubscribe = onSnapshot(aircraftQuery, (snapshot) => {
            const aircrafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aircraft));
            setAircraftList(aircrafts);
        }, (error) => {
            console.error("Error fetching real-time aircraft data:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not fetch live aircraft updates." });
        });

        const techReportsQuery = query(collection(db, `companies/${company.id}/technical-reports`));
        const unsubscribeTechReports = onSnapshot(techReportsQuery, (snapshot) => {
            const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TechnicalReport));
            setTechnicalReports(reports);
        });

        // Cleanup subscription on component unmount
        return () => {
            unsubscribe();
            unsubscribeTechReports();
        };
    }, [company, toast]);
    
    useEffect(() => {
        // We still set initial data to avoid flickering on load
        setAircraftList(initialAircraft);
        setBookings(initialBookings);
        setExternalContacts(initialExternalContacts);
        setTechnicalReports(initialTechnicalReports);
    }, [initialAircraft, initialBookings, initialExternalContacts, initialTechnicalReports]);
    
    
    const fetchHistory = useCallback(async () => {
        if (selectedHistoryAircraftId && company) {
            const history = await getChecklistHistory(company.id, selectedHistoryAircraftId);
            setChecklistHistory(history);
        } else {
            setChecklistHistory([]);
        }
    }, [selectedHistoryAircraftId, company]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);


    const activeAircraft = useMemo(() => aircraftList.filter(a => a.status !== 'Archived'), [aircraftList]);
    const archivedAircraft = useMemo(() => aircraftList.filter(a => a.status === 'Archived'), [aircraftList]);
    
    const selectedAircraftForChecklist = useMemo(() => {
        if (!selectedChecklistAircraftId) return null;
        return activeAircraft.find(ac => ac.id === selectedChecklistAircraftId);
    }, [activeAircraft, selectedChecklistAircraftId]);
    
    const activeBookingForSelectedAircraft = useMemo(() => {
        if (!selectedAircraftForChecklist || !selectedAircraftForChecklist.activeBookingId) return null;
        return bookings.find(b => b.id === selectedAircraftForChecklist.activeBookingId);
    }, [selectedAircraftForChecklist, bookings]);

    const handleSuccess = () => {
        setIsNewAircraftDialogOpen(false);
        setEditingAircraft(null);
    };
    
    const handleEdit = (aircraft: Aircraft) => {
        setEditingAircraft(aircraft);
        setIsNewAircraftDialogOpen(true);
    };

    const handleArchive = async (aircraft: Aircraft) => {
        if (!company) return;
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        await updateDoc(aircraftRef, { status: 'Archived' });
        toast({
            title: 'Aircraft Archived',
            description: `${aircraft.tailNumber} has been moved to the archives.`,
        });
    };

    const handleDelete = async (aircraftId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/aircraft`, aircraftId));
            toast({
                title: 'Aircraft Deleted',
                description: 'The aircraft has been permanently removed from the fleet.',
            });
            // The onSnapshot listener will update the UI automatically
        } catch (error) {
            console.error("Error deleting aircraft:", error);
            toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the aircraft.' });
        }
    };
    
    const handleRestore = async (aircraft: Aircraft) => {
        if (!company) return;
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        await updateDoc(aircraftRef, { status: 'Available' });
        toast({
            title: 'Aircraft Restored',
            description: `${aircraft.tailNumber} has been restored to the active fleet.`,
        });
    };

    const handleReturnToService = async (aircraft: Aircraft) => {
        if (!company) return;
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        await updateDoc(aircraftRef, { status: 'Available' });
        toast({
            title: 'Aircraft Returned to Service',
            description: `${aircraft.tailNumber} is now marked as Available.`,
        });
    };
    
    const handleClearPostFlight = async (aircraft: Aircraft) => {
        if (!company) return;
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        await updateDoc(aircraftRef, { checklistStatus: 'ready' });
        toast({
            title: 'Post-Flight Cleared',
            description: `Aircraft ${aircraft.tailNumber} is now marked as ready.`,
        });
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
        if (!selectedAircraftForChecklist || !user || !company) return;

        const isPreFlight = 'registration' in data;
        const batch = writeBatch(db);
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, selectedAircraftForChecklist.id);
        const bookingForChecklist = bookings.find(b => b.id === selectedAircraftForChecklist.activeBookingId);

        try {
            const historyDoc: Omit<CompletedChecklist, 'id'> = {
                aircraftId: selectedAircraftForChecklist.id,
                aircraftTailNumber: selectedAircraftForChecklist.tailNumber,
                userId: user.id,
                userName: user.name,
                dateCompleted: new Date().toISOString(),
                type: isPreFlight ? 'Pre-Flight' : 'Post-Flight',
                results: data,
                bookingNumber: bookingForChecklist?.bookingNumber,
            };
            const historyCollectionRef = collection(db, `companies/${company.id}/aircraft/${selectedAircraftForChecklist.id}/completed-checklists`);
            batch.set(doc(historyCollectionRef), historyDoc);

            if (isPreFlight) {
                batch.update(aircraftRef, { checklistStatus: 'needs-post-flight' });
                if (bookingForChecklist) {
                    const bookingRef = doc(db, `companies/${company.id}/bookings`, bookingForChecklist.id);
                    batch.update(bookingRef, { startHobbs: data.hobbs });
                }
                toast({ title: 'Pre-Flight Checklist Submitted' });
            } else { // POST-FLIGHT LOGIC
                batch.update(aircraftRef, { checklistStatus: 'ready', activeBookingId: null });

                if (bookingForChecklist) {
                    const bookingRef = doc(db, `companies/${company.id}/bookings`, bookingForChecklist.id);
                    const flightDuration = parseFloat((data.hobbs - (bookingForChecklist.startHobbs || 0)).toFixed(1));
                    
                    if (bookingForChecklist.purpose === 'Training' && bookingForChecklist.studentId) {
                        const studentRef = doc(db, `companies/${company.id}/students`, bookingForChecklist.studentId);
                        const newLogEntryId = `log-${Date.now()}`;
                        const newLogEntry: Omit<TrainingLogEntry, 'id'> = {
                            date: bookingForChecklist.date,
                            aircraft: `${selectedAircraftForChecklist.make} ${selectedAircraftForChecklist.model}`,
                            departure: bookingForChecklist.departure,
                            arrival: bookingForChecklist.arrival,
                            departureTime: bookingForChecklist.startTime,
                            arrivalTime: bookingForChecklist.endTime,
                            startHobbs: bookingForChecklist.startHobbs || 0,
                            endHobbs: data.hobbs,
                            flightDuration: flightDuration,
                            instructorName: bookingForChecklist.instructor || 'Unknown',
                            trainingExercises: [], // Initially empty, to be filled during debrief
                        };
                        
                        batch.update(studentRef, { 
                            trainingLogs: arrayUnion({ ...newLogEntry, id: newLogEntryId }),
                            pendingBookingIds: arrayUnion(bookingForChecklist.id)
                        });
                        
                        // Link the log entry ID back to the booking
                        batch.update(bookingRef, { status: 'Completed', flightDuration: flightDuration, endHobbs: data.hobbs, pendingLogEntryId: newLogEntryId });

                    } else {
                         batch.update(bookingRef, { status: 'Completed', flightDuration: flightDuration, endHobbs: data.hobbs });
                    }
                }
                toast({ title: 'Post-Flight Checklist Submitted', description: 'Logbook entry created. Ready for debrief.' });
            }

            await batch.commit();
            setSelectedChecklistAircraftId(null);
        } catch (error) {
            console.error("Error submitting checklist:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not submit checklist.' });
        }
    };
    
    const handleReportIssue = async (aircraftId: string, issueDetails: { title: string, description: string, photo?: string }) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot report issue without user context.' });
            return;
        }

        const aircraft = aircraftList.find(a => a.id === aircraftId);
        if (!aircraft) return;

        toast({ 
            title: 'Issue Reported & Alert Sent', 
            description: `Aircraft ${aircraft.tailNumber} status set to In Maintenance. An alert has been sent.`
        });
    };


    const handleDeleteChecklist = async (checklistId: string) => {
        if (!selectedHistoryAircraftId || !company) {
            toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete checklist without aircraft context.' });
            return;
        }
        
        try {
            const docRef = doc(db, `companies/${company.id}/aircraft/${selectedHistoryAircraftId}/completed-checklists`, checklistId);
            await deleteDoc(docRef);
            setViewingChecklist(null);
            toast({ title: 'Checklist Deleted', description: 'The checklist history record has been removed.' });
            fetchHistory(); // Refresh the list
        } catch(e) {
            console.error(e);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete checklist.' });
        }
    };
    
    const handleAircraftSelected = (aircraftId: string | null) => {
        setSelectedChecklistAircraftId(aircraftId);
    };

    const isSuperUser = user?.permissions.includes('Super User');

    const handleRectificationSubmit = async (values: {
        rectificationDetails: string;
        componentsReplaced: string;
        physicalLogEntry: string;
    }) => {
        if (!editingReport || !company || !user) return;
        
        const updatedReport: TechnicalReport = {
            ...editingReport,
            ...values,
            status: 'Rectified',
            rectifiedBy: user.name,
            rectificationDate: new Date().toISOString(),
        };

        try {
            const reportRef = doc(db, `companies/${company.id}/technical-reports`, editingReport.id);
            await updateDoc(reportRef, updatedReport as any);
            setTechnicalReports(prev => prev.map(r => r.id === editingReport.id ? updatedReport : r));
            setEditingReport(null);
            toast({ title: 'Rectification Saved', description: `Report ${editingReport.reportNumber} has been updated.`});
        } catch (error) {
            console.error("Error saving rectification:", error);
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the rectification details.'});
        }
    };

    const handleDeleteTechReport = async (reportId: string) => {
        if (!company) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/technical-reports`, reportId));
            setTechnicalReports(prev => prev.filter(r => r.id !== reportId));
            toast({ title: 'Technical Report Deleted' });
        } catch (error) {
            console.error("Error deleting tech report:", error);
            toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete the technical report.' });
        }
    };

    const AircraftCardList = ({ aircraft, isArchived }: { aircraft: Aircraft[], isArchived?: boolean }) => {
        if (isDataLoading) {
            return (
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                    <p className="text-muted-foreground">Loading aircraft...</p>
                </div>
            )
        }
        
        if (aircraft.length === 0) {
            return (
                <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">No aircraft found in this category.</p>
                </div>
            )
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {aircraft.map((ac) => {
                    const hoursUntil50 = ac.next50HourInspection ? (ac.next50HourInspection - (ac.currentTachoReading || 0)) : -1;
                    const hoursUntil100 = ac.next100HourInspection ? (ac.next100HourInspection - (ac.currentTachoReading || 0)) : -1;
                    const openTechReports = technicalReports.filter(r => r.aircraftRegistration === ac.tailNumber && r.status !== 'Rectified').length;

                    return (
                        <Card key={ac.id} className={cn("flex flex-col", isArchived && 'bg-muted/50')}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{ac.tailNumber}</CardTitle>
                                        <CardDescription>{ac.make} {ac.model}</CardDescription>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                        {isArchived ? (
                                            <>
                                                <DropdownMenuItem onClick={() => handleRestore(ac)}>
                                                    <RotateCw className="mr-2 h-4 w-4" /> Restore
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the aircraft "{ac.tailNumber}" and all its associated data.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(ac.id)}>Yes, delete aircraft</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </>
                                        ) : (
                                            <>
                                                {ac.status === 'In Maintenance' && (
                                                    <DropdownMenuItem onClick={() => handleReturnToService(ac)}>
                                                        <Check className="mr-2 h-4 w-4" /> Return to Service
                                                    </DropdownMenuItem>
                                                )}
                                                {isSuperUser && ac.checklistStatus === 'needs-post-flight' && (
                                                    <DropdownMenuItem onClick={() => handleClearPostFlight(ac)}>
                                                        <ListChecks className="mr-2 h-4 w-4" /> Clear Post-Flight
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem onSelect={() => handleEdit(ac)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={() => setViewingHistoryFor(ac)}>
                                                    <BookOpen className="mr-2 h-4 w-4" /> Technical Log
                                                </DropdownMenuItem>
                                                 <DropdownMenuItem onSelect={() => setViewingDocumentsForAircraft(ac)}>
                                                    <Eye className="mr-2 h-4 w-4" /> View Documents
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                            <Archive className="mr-2 h-4 w-4" /> Archive
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
                                </div>
                                <div className="pt-2">
                                     <Badge variant={getStatusVariant(ac.status)}>{ac.status}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm flex-grow">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Hobbs</span>
                                    <span>{ac.hours.toFixed(1)}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Tacho</span>
                                    <span>{ac.currentTachoReading?.toFixed(1) ?? 'N/A'}</span>
                                </div>
                                <Separator />
                                 <div className="flex justify-between">
                                    <span className="text-muted-foreground">Next 50hr Insp.</span>
                                    <span>{hoursUntil50 >= 0 ? `${hoursUntil50.toFixed(1)} hrs` : 'N/A'}</span>
                                </div>
                                 <div className="flex justify-between">
                                    <span className="text-muted-foreground">Next 100hr Insp.</span>
                                    <span>{hoursUntil100 >= 0 ? `${hoursUntil100.toFixed(1)} hrs` : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Open Tech Logs</span>
                                    <span>{openTechReports}</span>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        )
    };
    
    const generatePdf = (checklist: CompletedChecklist) => {
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
            tableBody.push(['Certificate of Airworthiness Onboard', preFlightResults.airworthinessOnboard ? 'Yes' : 'No']);
            tableBody.push(['Insurance Certificate Onboard', preFlightResults.insuranceOnboard ? 'Yes' : 'No']);
            tableBody.push(['Certificate of Release to Service Onboard', preFlightResults.releaseToServiceOnboard ? 'Yes' : 'No']);
            tableBody.push(['Certificate of Registration Onboard', preFlightResults.registrationOnboard ? 'Yes' : 'No']);
            tableBody.push(['Mass and Balance Onboard', preFlightResults.massAndBalanceOnboard ? 'Yes' : 'No']);
            tableBody.push(['Radio Station License Onboard', preFlightResults.radioLicenseOnboard ? 'Yes' : 'No']);
        } else {
            tableBody.push(['Defect Reported', (results as PostFlightChecklistFormValues).report && (results as PostFlightChecklistFormValues).report!.length > 0 ? 'Yes' : 'No']);
        }
    
        autoTable(doc, {
            startY: yPos,
            head: [['Item', 'Result']],
            body: tableBody,
        });
    
        yPos = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Anything to Report?', 14, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        
        const reportText = (results as any).report || 'Nothing reported.';
        const splitText = doc.splitTextToSize(reportText, 180);
        doc.text(splitText, 14, yPos);
        yPos += splitText.length * 5; 

        yPos += 25;

        const addImageSection = (title: string, dataUrl: string | undefined) => {
            if (dataUrl) {
                if (yPos > 220) { 
                    doc.addPage();
                    yPos = 20;
                }
                doc.setFont('helvetica', 'bold');
                doc.text(title, 14, yPos);
                yPos += 5;
                doc.addImage(dataUrl, 'JPEG', 14, yPos, 80, 45);
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
        if ((results as any).defectPhoto) {
            addImageSection('Defect Photo:', (results as any).defectPhoto);
        }
        
        return doc;
    };
    
    const handleDownloadChecklist = (checklist: CompletedChecklist) => {
        const doc = generatePdf(checklist);
        doc.save(`checklist_${checklist.aircraftTailNumber}_${checklist.id}.pdf`);
    };

    const handleEmailChecklist = async (checklist: CompletedChecklist, email: string) => {
        if (!email) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter a valid email address.' });
            return;
        }
        toast({ title: 'Email Sent', description: `The report has been sent to ${email}.` });
    };
    
    const ChecklistItemDisplay = ({ label, value }: { label: string; value: boolean | undefined }) => {
        const Icon = value ? CheckCircle2 : XCircle;
        const color = value ? 'text-green-500' : 'text-destructive';
        return (
            <div className="flex items-center text-sm">
                <Icon className={cn("mr-2 h-4 w-4", color)} />
                <span className={cn(color, !value && "line-through")}>{label}</span>
            </div>
        );
    };
    
  const ChecklistForms = () => (
      <>
          <div className="mb-4">
              <Button variant="outline" size="sm" onClick={() => handleAircraftSelected(null)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Change Aircraft
              </Button>
          </div>
          {isSuperUser ? (
              <Tabs defaultValue="pre-flight">
                  <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="pre-flight">Pre-Flight</TabsTrigger>
                      <TabsTrigger value="post-flight">Post-Flight</TabsTrigger>
                  </TabsList>
                  <TabsContent value="pre-flight" className="pt-4">
                      <PreFlightChecklistForm
                          onSuccess={handleChecklistSuccess}
                          aircraft={selectedAircraftForChecklist!}
                          onReportIssue={handleReportIssue}
                      />
                  </TabsContent>
                  <TabsContent value="post-flight" className="pt-4">
                      <PostFlightChecklistForm
                          onSuccess={handleChecklistSuccess}
                          aircraft={selectedAircraftForChecklist!}
                          startHobbs={activeBookingForSelectedAircraft?.startHobbs}
                          onReportIssue={handleReportIssue}
                      />
                  </TabsContent>
              </Tabs>
          ) : (
              selectedAircraftForChecklist?.checklistStatus === 'needs-post-flight' ? (
                  <PostFlightChecklistForm
                      onSuccess={handleChecklistSuccess}
                      aircraft={selectedAircraftForChecklist!}
                      startHobbs={activeBookingForSelectedAircraft?.startHobbs}
                      onReportIssue={handleReportIssue}
                  />
              ) : (
                  <PreFlightChecklistForm
                      onSuccess={handleChecklistSuccess}
                      aircraft={selectedAircraftForChecklist!}
                      onReportIssue={handleReportIssue}
                  />
              )
          )}
      </>
  );
  
    const HistoryDialogContent = ({ aircraft }: { aircraft: Aircraft }) => {
        const aircraftReports = useMemo(() => 
            technicalReports.filter(report => report.aircraftRegistration === aircraft.tailNumber),
            [aircraft, technicalReports]
        );

        const componentFrequency = useMemo(() => {
            const counts = aircraftReports.reduce((acc, report) => {
                const key = report.subcomponent || report.component;
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            return Object.entries(counts).map(([name, count]) => ({ name, count }));
        }, [aircraftReports]);

        return (
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Technical Report History: {aircraft.tailNumber}</DialogTitle>
                    <DialogDescription>A log of all technical issues reported for this aircraft.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <Card className="border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-lg">Component Report Frequency</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] w-full pr-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={componentFrequency} layout="vertical" margin={{ left: 100 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} interval={0} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Reports" fill="hsl(var(--primary))" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                    <Card className="border-primary/20">
                        <CardHeader>
                            <CardTitle className="text-lg">Detailed History</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-64">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Report #</TableHead>
                                            <TableHead>System</TableHead>
                                            <TableHead>Component</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Reported By</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {aircraftReports.length > 0 ? aircraftReports.map(report => (
                                            <TableRow key={report.id}>
                                                <TableCell>{format(parseISO(report.dateReported), 'MMM d, yyyy')}</TableCell>
                                                <TableCell>
                                                    <Button variant="link" className="p-0 h-auto" onClick={() => setEditingReport(report)}>
                                                        {report.reportNumber}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>{report.component}</TableCell>
                                                <TableCell>{report.subcomponent || 'N/A'}</TableCell>
                                                <TableCell className="max-w-xs truncate">{report.description}</TableCell>
                                                <TableCell>{report.reportedBy}</TableCell>
                                                <TableCell><Badge variant={report.status === 'Rectified' ? 'success' : 'destructive'}>{report.status || 'Open'}</Badge></TableCell>
                                                <TableCell className="text-right">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the technical report {report.reportNumber}.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteTechReport(report.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-24 text-center">No technical reports found for this aircraft.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        )
    };


  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle>Manage Fleet</CardTitle>
                <CardDescription>View and manage all aircraft in your fleet.</CardDescription>
            </div>
            <Button onClick={openNewDialog} className="w-full md:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Aircraft
            </Button>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="active">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="active">Active Fleet ({activeAircraft.length})</TabsTrigger>
                    <TabsTrigger value="archived">Archived ({archivedAircraft.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4">
                    <AircraftCardList aircraft={activeAircraft} />
                </TabsContent>
                <TabsContent value="archived" className="mt-4">
                     <AircraftCardList aircraft={archivedAircraft} isArchived />
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <div className="space-y-1">
                <CardTitle>Aircraft Operations</CardTitle>
                <CardDescription>Perform checklists and view historical records.</CardDescription>
              </div>
          </CardHeader>
          <CardContent>
              <Tabs defaultValue="checklists">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-2">
                    <TabsTrigger value="checklists"><CheckCircle2 className="mr-2 h-4 w-4" />Aircraft Checklist</TabsTrigger>
                    <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />Checklist History</TabsTrigger>
                </TabsList>
                 <TabsContent value="checklists" className="pt-6">
                    <div className="max-w-2xl mx-auto space-y-6">
                        {!selectedAircraftForChecklist ? (
                            <ChecklistStarter 
                                aircraftList={activeAircraft} 
                                onAircraftSelected={handleAircraftSelected} 
                            />
                        ) : (
                           <ChecklistForms />
                        )}
                    </div>
                </TabsContent>
                 <TabsContent value="history" className="pt-6">
                    <div className="space-y-2">
                        <Label>Select an aircraft to view history</Label>
                        <Select onValueChange={setSelectedHistoryAircraftId}>
                            <SelectTrigger className="w-full md:w-[300px]">
                                <SelectValue placeholder="Select aircraft..." />
                            </SelectTrigger>
                            <SelectContent>
                                {activeAircraft.map(ac => (
                                    <SelectItem key={ac.id} value={ac.id}>{ac.tailNumber} ({ac.model})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {checklistHistory.length > 0 ? (
                        <ScrollArea className="w-full" orientation="horizontal">
                            <Table className="mt-4 min-w-max">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>User</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {checklistHistory.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell>{format(parseISO(item.dateCompleted), 'PPP p')}</TableCell>
                                    <TableCell>{item.type}</TableCell>
                                    <TableCell>{item.userName}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => setViewingChecklist(item)}>
                                            <Eye className="mr-2 h-4 w-4" /> View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                            </Table>
                        </ScrollArea>
                    ) : (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">
                                {selectedHistoryAircraftId ? "No checklist history for this aircraft." : "Select an aircraft to see history."}
                            </p>
                        </div>
                    )}
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
        
        <Dialog open={!!viewingDocumentsForAircraft} onOpenChange={(open) => !open && setViewingDocumentsForAircraft(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Document Expiry Dates for {viewingDocumentsForAircraft?.tailNumber}</DialogTitle>
                    <DialogDescription>
                        A list of all official documents and their expiry dates for this aircraft.
                    </DialogDescription>
                </DialogHeader>
                 <ScrollArea className="max-h-[70vh]">
                    <div className="py-4 space-y-4 pr-4">
                        <div className="flex items-center justify-between text-sm">
                            <span>Certificate of Airworthiness</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.airworthinessExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Insurance Certificate</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.insuranceExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Certificate of Release to Service</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.certificateOfReleaseToServiceExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Certificate of Registration</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.certificateOfRegistrationExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Mass & Balance</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.massAndBalanceExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Radio Station License</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.radioStationLicenseExpiry, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
        
        {viewingHistoryFor && (
            <Dialog open={!!viewingHistoryFor} onOpenChange={(open) => !open && setViewingHistoryFor(null)}>
                <HistoryDialogContent aircraft={viewingHistoryFor} />
            </Dialog>
        )}

        {editingReport && (
            <Dialog open={!!editingReport} onOpenChange={() => setEditingReport(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rectify Technical Report: {editingReport.reportNumber}</DialogTitle>
                    </DialogHeader>
                    <RectificationForm report={editingReport} onSubmit={handleRectificationSubmit} />
                </DialogContent>
            </Dialog>
        )}


        {viewingChecklist && (
             <Dialog open={!!viewingChecklist} onOpenChange={(open) => !open && setViewingChecklist(null)}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{viewingChecklist.type} Checklist: {viewingChecklist.aircraftTailNumber}</DialogTitle>
                        <DialogDescription>
                            Completed by {viewingChecklist.userName} on {format(parseISO(viewingChecklist.dateCompleted), 'PPP p')}
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh] pr-4">
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm">Flight Details</h4>
                                <p className="text-sm"><strong>Hobbs:</strong> {(viewingChecklist.results as any).hobbs}</p>
                            </div>
                            <Separator />

                            {(viewingChecklist.type === 'Pre-Flight') && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Document Checks</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                        <ChecklistItemDisplay label="Aircraft Checklist/POH" value={(viewingChecklist.results as PreFlightChecklistFormValues).checklistOnboard} />
                                        <ChecklistItemDisplay label="Flight Ops Manual" value={(viewingChecklist.results as PreFlightChecklistFormValues).fomOnboard} />
                                        <ChecklistItemDisplay label="Cert. of Airworthiness" value={(viewingChecklist.results as PreFlightChecklistFormValues).airworthinessOnboard} />
                                        <ChecklistItemDisplay label="Insurance Certificate" value={(viewingChecklist.results as PreFlightChecklistFormValues).insuranceOnboard} />
                                        <ChecklistItemDisplay label="Release to Service" value={(viewingChecklist.results as PreFlightChecklistFormValues).releaseToServiceOnboard} />
                                        <ChecklistItemDisplay label="Cert. of Registration" value={(viewingChecklist.results as PreFlightChecklistFormValues).registrationOnboard} />
                                        <ChecklistItemDisplay label="Mass & Balance" value={(viewingChecklist.results as PreFlightChecklistFormValues).massAndBalanceOnboard} />
                                        <ChecklistItemDisplay label="Radio Station License" value={(viewingChecklist.results as PreFlightChecklistFormValues).radioLicenseOnboard} />
                                    </div>
                                </div>
                            )}
                            <Separator />

                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Photos</h4>
                                <div className="flex flex-wrap gap-2">
                                    {(viewingChecklist.results as any).leftSidePhoto && <Image src={(viewingChecklist.results as any).leftSidePhoto} alt="Left side" width={200} height={112} className="rounded-md" />}
                                    {(viewingChecklist.results as any).rightSidePhoto && <Image src={(viewingChecklist.results as any).rightSidePhoto} alt="Right side" width={200} height={112} className="rounded-md" />}
                                    {(viewingChecklist.results as any).defectPhoto && <Image src={(viewingChecklist.results as any).defectPhoto} alt="Defect" width={200} height={112} className="rounded-md" />}
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Report</h4>
                                <p className="text-sm p-2 bg-muted rounded-md min-h-16">{(viewingChecklist.results as any).report || "No issues reported."}</p>
                            </div>
                        </div>
                    </ScrollArea>
                     <DialogFooter className="gap-2 sm:justify-between flex-col sm:flex-row">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4"/>
                                    Delete Record
                                </Button>
                            </AlertDialogTrigger>
                             <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete this checklist record. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteChecklist(viewingChecklist.id)}>Yes, Delete Record</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <div className="flex gap-2 justify-end">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline">
                                        <Mail className="mr-2 h-4 w-4"/>
                                        Email Report
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Email Checklist Report</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Select a recipient from your external contacts or enter an email address manually.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <div className="py-4 space-y-4">
                                        <Select onValueChange={(value) => {
                                            const emailInput = document.getElementById('email-input') as HTMLInputElement;
                                            if (emailInput) emailInput.value = value;
                                        }}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select from external contacts..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {externalContacts.map(contact => {
                                                    const key = `${contact.id}-${contact.email}`;
                                                    return <SelectItem key={key} value={contact.email}>{contact.name} ({contact.email})</SelectItem>
                                                })}
                                            </SelectContent>
                                        </Select>
                                        <div className="space-y-2">
                                            <Label htmlFor="email-input">Or enter email manually</Label>
                                            <Input id="email-input" type="email" placeholder="recipient@example.com" />
                                        </div>
                                    </div>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => {
                                            const email = (document.getElementById('email-input') as HTMLInputElement)?.value;
                                            if (viewingChecklist) {
                                                handleEmailChecklist(viewingChecklist, email);
                                            }
                                        }}>Send Email</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button variant="outline" onClick={() => handleDownloadChecklist(viewingChecklist)}>
                                <Download className="mr-2 h-4 w-4"/>
                                Download PDF
                            </Button>
                        </div>
                     </DialogFooter>
                </DialogContent>
             </Dialog>
        )}
    </main>
  );
}

const RectificationForm = ({ report, onSubmit }: { report: TechnicalReport; onSubmit: (values: any) => void; }) => {
    const [rectificationDetails, setRectificationDetails] = useState(report.rectificationDetails || '');
    const [componentsReplaced, setComponentsReplaced] = useState(report.componentsReplaced || '');
    const [physicalLogEntry, setPhysicalLogEntry] = useState(report.physicalLogEntry || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            rectificationDetails,
            componentsReplaced,
            physicalLogEntry,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="rectificationDetails">Rectification Details</Label>
                <Textarea id="rectificationDetails" value={rectificationDetails} onChange={(e) => setRectificationDetails(e.target.value)} placeholder="Describe the work carried out..." required />
            </div>
            <div className="space-y-2">
                <Label htmlFor="componentsReplaced">Components Replaced</Label>
                <Input id="componentsReplaced" value={componentsReplaced} onChange={(e) => setComponentsReplaced(e.target.value)} placeholder="e.g., Brake pads, Tyre" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="physicalLogEntry">Physical Log Entry #</Label>
                <Input id="physicalLogEntry" value={physicalLogEntry} onChange={(e) => setPhysicalLogEntry(e.target.value)} placeholder="Enter the aircraft's physical logbook entry number" required />
            </div>
            <DialogFooter>
                <Button type="submit">Save Rectification</Button>
            </DialogFooter>
        </form>
    )
}
