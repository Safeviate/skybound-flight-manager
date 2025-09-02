

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Edit, Archive, RotateCw, Plane, ArrowLeft, Check, Download, History, ChevronRight, Trash2, Mail, Eye, CheckCircle2, XCircle, AlertTriangle, Loader2, ListChecks, Wrench, BookOpen, ChevronDown } from 'lucide-react';
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
import { getTechnicalReportsForAircraft } from './data';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

async function getChecklistHistory(companyId: string, aircraftId: string): Promise<CompletedChecklist[]> {
    if (!companyId || !aircraftId) return [];
    const historyRef = collection(db, `companies/${companyId}/aircraft/${aircraftId}/completed-checklists`);
    const snapshot = await getDocs(historyRef);
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CompletedChecklist));
}

const componentHierarchy = {
    "Airframe": ["Fuselage", "Wings", "Empennage", "Doors", "Windows"],
    "Powerplant": ["Engine", "Propeller", "Exhaust System", "Ignition System", "Fuel System (Engine)"],
    "Landing Gear": ["Main Gear", "Nose Gear", "Wheels", "Tires", "Brakes"],
    "Avionics/Instruments": ["GPS/Navigation", "Com Radio", "Transponder", "Attitude Indicator", "Airspeed Indicator", "Altimeter", "Other Instrument"],
    "Flight Controls": ["Ailerons", "Elevator/Stabilator", "Rudder", "Flaps", "Control Cables/Rods"],
    "Fuel System": ["Tanks", "Lines & Hoses", "Pumps", "Gauges"],
    "Electrical System": ["Battery", "Alternator/Generator", "Wiring", "Circuit Breakers", "Lighting"],
    "Interior/Cabin": ["Seats", "Belts/Harnesses", "HVAC", "Panels/Trim"],
    "Other": [],
};

const componentOptions = Object.keys(componentHierarchy);
const allSubcomponents = Array.from(new Set(Object.values(componentHierarchy).flat()));

const TechnicalLogView = ({ aircraftList }: { aircraftList: Aircraft[] }) => {
    const { user, company } = useUser();
    const { toast } = useToast();
    const [selectedAircraftId, setSelectedAircraftId] = useState<string | null>(null);
    const [reports, setReports] = useState<TechnicalReport[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingReport, setEditingReport] = useState<TechnicalReport | null>(null);
    const [rectifyingReport, setRectifyingReport] = useState<TechnicalReport | null>(null);
    
    const fetchReports = useCallback(async () => {
        if (!company || !selectedAircraftId) {
            setReports([]);
            return;
        }
        setIsLoading(true);
        const selectedAircraft = aircraftList.find(a => a.id === selectedAircraftId);
        if (selectedAircraft) {
            const fetchedReports = await getTechnicalReportsForAircraft(company.id, selectedAircraft.tailNumber);
            setReports(fetchedReports);
        }
        setIsLoading(false);
    }, [company, selectedAircraftId, aircraftList]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    const chartData = useMemo(() => {
        const counts = reports.reduce((acc, report) => {
            const specificComponent = report.componentDetails || report.otherInstrument || report.otherComponent || report.subcomponent || report.component;
            const system = report.component;
    
            // Create a unique key to group by, including the parent system to avoid name clashes
            const key = `${specificComponent} (${system})`;
    
            if (!acc[key]) {
                acc[key] = {
                    name: specificComponent,
                    system: system,
                    count: 0
                };
            }
            acc[key].count++;
            return acc;
        }, {} as Record<string, { name: string, system: string, count: number }>);
    
        return Object.values(counts);
    }, [reports]);

    const handleUpdateReport = async (updatedData: Partial<TechnicalReport>) => {
        if (!editingReport || !company) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update report.' });
            return;
        }
        
        const reportRef = doc(db, `companies/${company.id}/technical-reports`, editingReport.id);
        
        try {
            await updateDoc(reportRef, updatedData);
            setEditingReport(null);
            fetchReports();
            toast({ title: 'Report Updated', description: 'The technical log has been updated.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update the report.' });
        }
    };
    
    const handleRectifyReport = async (updatedData: Partial<TechnicalReport>) => {
        if (!rectifyingReport || !company) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update report.' });
            return;
        }
        
        const reportRef = doc(db, `companies/${company.id}/technical-reports`, rectifyingReport.id);
        
        const finalData = {
            ...updatedData,
            status: 'Rectified',
            rectificationDate: new Date().toISOString(),
            rectifiedBy: user?.name,
        }

        try {
            await updateDoc(reportRef, finalData);
            setRectifyingReport(null);
            fetchReports();
            toast({ title: 'Report Updated', description: 'The technical log has been updated.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update the report.' });
        }
    };

    const chartHeight = Math.max(300, chartData.length * 50);

    const CustomYAxisTick = React.memo(({ y, payload }: any) => {
        const item = chartData.find(d => d.name === payload.value);
        return (
            <g transform={`translate(0,${y})`}>
                <text x={0} y={0} dy={-2} textAnchor="start" fill="#666" className="text-sm font-semibold">{payload.value}</text>
                {item && <text x={0} y={0} dy={12} textAnchor="start" fill="#999" className="text-xs">{item.system}</text>}
            </g>
        );
    });
    CustomYAxisTick.displayName = 'CustomYAxisTick';


    return (
        <div className="space-y-6">
             <div className="max-w-xs">
                <Label>Select an aircraft to view its technical log</Label>
                <Select onValueChange={setSelectedAircraftId} value={selectedAircraftId || ''}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select aircraft..." />
                    </SelectTrigger>
                    <SelectContent>
                        {aircraftList.map(ac => (
                             <SelectItem key={ac.id} value={ac.id}>{ac.tailNumber} ({ac.make} {ac.model})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            {!selectedAircraftId ? (
                <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground">Please select an aircraft to view its history.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 py-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Component Report Frequency</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px] w-full">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" /></div>
                            ) : chartData.length > 0 ? (
                                <ScrollArea className="h-full">
                                    <ResponsiveContainer width="100%" height={chartHeight}>
                                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" allowDecimals={false} />
                                            <YAxis dataKey="name" type="category" width={150} interval={0} tick={<CustomYAxisTick />} />
                                            <Tooltip />
                                            <Bar dataKey="count" fill="hsl(var(--primary))" name="Reports" barSize={20} key={(bar) => bar.name} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ScrollArea>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">No chart data available.</div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Detailed History</CardTitle>
                        </CardHeader>
                        <CardContent>
                           {isLoading ? (
                                <div className="flex items-center justify-center h-24"><Loader2 className="animate-spin" /></div>
                           ) : reports.length > 0 ? (
                               <div className="space-y-2">
                                   {reports.map(report => (
                                       <Collapsible key={report.id} className="border p-4 rounded-lg">
                                           <CollapsibleTrigger asChild>
                                               <div className="flex justify-between items-center cursor-pointer">
                                                   <div className="flex-1">
                                                        <p className="font-semibold">{report.reportNumber}: {report.description}</p>
                                                        <p className="text-sm text-muted-foreground">{format(parseISO(report.dateReported), 'PPP')} - {report.otherInstrument || report.otherComponent || report.subcomponent || report.component}</p>
                                                   </div>
                                                   <div className="flex items-center gap-4">
                                                        <Badge variant={report.status === 'Rectified' ? 'success' : 'warning'}>
                                                            {report.status || 'Open'}
                                                        </Badge>
                                                        {report.status !== 'Rectified' && (
                                                            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setRectifyingReport(report); }}>
                                                                <Wrench className="mr-2 h-4 w-4" /> Rectify
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                   </div>
                                               </div>
                                           </CollapsibleTrigger>
                                           <CollapsibleContent className="pt-4 mt-4 border-t space-y-4">
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                    <div><p className="font-medium text-muted-foreground">Reported By</p><p>{report.reportedBy}</p></div>
                                                    <div><p className="font-medium text-muted-foreground">System</p><p>{report.component}</p></div>
                                                    <div><p className="font-medium text-muted-foreground">Component</p><p>{report.otherInstrument || report.otherComponent || report.subcomponent || 'N/A'}</p></div>
                                                    {report.componentDetails && (
                                                        <div className="col-span-full"><p className="font-medium text-muted-foreground">Component Details</p><p>{report.componentDetails}</p></div>
                                                    )}
                                                    <div><p className="font-medium text-muted-foreground">Logbook Entry #</p><p>{report.physicalLogEntry || 'N/A'}</p></div>
                                                </div>
                                                <Separator />
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                     <div><p className="font-medium text-muted-foreground">Rectified By</p><p>{report.rectifiedBy || 'N/A'}</p></div>
                                                     <div><p className="font-medium text-muted-foreground">Rectification Date</p><p>{report.rectificationDate ? format(parseISO(report.rectificationDate), 'PPP p') : 'N/A'}</p></div>
                                                </div>
                                                <div><p className="font-medium text-muted-foreground">Rectification Details</p><p className="text-sm p-2 bg-muted rounded-md">{report.rectificationDetails || 'N/A'}</p></div>
                                                <div><p className="font-medium text-muted-foreground">Components Replaced</p><p className="text-sm p-2 bg-muted rounded-md">{report.componentsReplaced || 'N/A'}</p></div>
                                                {report.photo && (
                                                    <div>
                                                        <p className="font-medium text-muted-foreground">Attached Photo</p>
                                                        <div className="mt-2">
                                                            <Image src={report.photo} alt="Technical report photo" width={400} height={225} className="rounded-md" />
                                                        </div>
                                                    </div>
                                                )}
                                                {report.status !== 'Rectified' && (
                                                    <div className="flex justify-end pt-4 border-t">
                                                        <Button variant="outline" size="sm" onClick={() => setEditingReport(report)}>
                                                            <Edit className="mr-2 h-4 w-4" /> Edit Original Report
                                                        </Button>
                                                    </div>
                                                )}
                                           </CollapsibleContent>
                                       </Collapsible>
                                   ))}
                               </div>
                           ) : (
                                <div className="h-24 flex items-center justify-center text-muted-foreground">
                                    No technical reports found.
                                </div>
                           )}
                        </CardContent>
                    </Card>
                </div>
            )}
             <Dialog open={!!rectifyingReport} onOpenChange={() => setRectifyingReport(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rectify Technical Report</DialogTitle>
                        <DialogDescription>Enter the details of the rectification for report {rectifyingReport?.reportNumber}.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const data = Object.fromEntries(formData.entries());
                            handleRectifyReport(data as Partial<TechnicalReport>);
                        }}
                        className="space-y-4 py-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="rectificationDetails">Rectification Details</Label>
                            <Textarea id="rectificationDetails" name="rectificationDetails" required defaultValue={rectifyingReport?.rectificationDetails || ''} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="componentsReplaced">Components Replaced</Label>
                            <Input id="componentsReplaced" name="componentsReplaced" defaultValue={rectifyingReport?.componentsReplaced || ''} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="physicalLogEntry">Physical Logbook Entry #</Label>
                            <Input id="physicalLogEntry" name="physicalLogEntry" defaultValue={rectifyingReport?.physicalLogEntry || ''} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setRectifyingReport(null)}>Cancel</Button>
                            <Button type="submit">Save &amp; Rectify</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <Dialog open={!!editingReport} onOpenChange={() => setEditingReport(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Technical Report</DialogTitle>
                        <DialogDescription>Edit the details for report {editingReport?.reportNumber}.</DialogDescription>
                    </DialogHeader>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const data = Object.fromEntries(formData.entries());
                            handleUpdateReport(data as Partial<TechnicalReport>);
                        }}
                        className="space-y-4 py-4"
                    >
                        <div className="space-y-2">
                            <Label htmlFor="component">System</Label>
                            <Select name="component" defaultValue={editingReport?.component}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select system..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {componentOptions.map(comp => (
                                        <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="subcomponent">Component</Label>
                             <Select name="subcomponent" defaultValue={editingReport?.subcomponent}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select component..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {allSubcomponents.map(sub => (
                                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description of Issue</Label>
                            <Textarea id="description" name="description" required defaultValue={editingReport?.description || ''} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditingReport(null)}>Cancel</Button>
                            <Button type="submit">Save Changes</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}


export function AircraftPageContent({ 
    initialAircraft,
    initialBookings,
    initialExternalContacts,
}: { 
    initialAircraft: Aircraft[],
    initialBookings: Booking[],
    initialExternalContacts: ExternalContact[],
}) {
    const [aircraftList, setAircraftList] = useState<Aircraft[]>(initialAircraft);
    const [bookings, setBookings] = useState<Booking[]>(initialBookings);
    const [externalContacts, setExternalContacts] = useState<ExternalContact[]>(initialExternalContacts);
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
    const [viewingChecklist, setViewingChecklist] = useState<CompletedChecklist | null>(null);
    
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

        // Cleanup subscription on component unmount
        return () => {
            unsubscribe();
        };
    }, [company, toast]);
    
    useEffect(() => {
        // We still set initial data to avoid flickering on load
        setAircraftList(initialAircraft);
        setBookings(initialBookings);
        setExternalContacts(initialExternalContacts);
    }, [initialAircraft, initialBookings, initialExternalContacts]);
    
    
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
    const canViewTechnicalLog = user?.permissions.includes('TechnicalLog:View') || isSuperUser;

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

        if (company?.logoUrl) {
            try {
                // Determine image type from data URL
                const imageType = company.logoUrl.split(';')[0].split('/')[1].toUpperCase();
                const pageWidth = doc.internal.pageSize.getWidth();
                const imageWidth = 20; 
                const imageHeight = 20;
                const xPos = pageWidth - imageWidth - 14; // Position on the right
                doc.addImage(company.logoUrl, imageType, xPos, 15, imageWidth, imageHeight);
            } catch (e) {
                console.error("Error adding logo to PDF:", e);
                // Fail gracefully if the image can't be added
            }
        }
    
        doc.setFontSize(18);
        doc.text(`${company?.name || 'Safeviate'} - ${checklist.type} Checklist: ${checklist.aircraftTailNumber}`, 14, 22);
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
    
  const ChecklistForms = () => {
    const isPostFlight = selectedAircraftForChecklist?.checklistStatus === 'needs-post-flight';

    if (isSuperUser) {
        // Super User can always see both forms and switch between them.
        return (
          <>
            <div className="mb-4">
                <Button variant="outline" size="sm" onClick={() => handleAircraftSelected(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Change Aircraft
                </Button>
            </div>
            <Tabs defaultValue={isPostFlight ? "post-flight" : "pre-flight"}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="pre-flight" disabled={isPostFlight}>Pre-Flight</TabsTrigger>
                    <TabsTrigger value="post-flight" disabled={!isPostFlight}>Post-Flight</TabsTrigger>
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
        </>
      );
    }
  
    // Logic for non-super users
    let canPerformPostFlight = false;
    if (isPostFlight) {
        if (!settings.enforcePostFlightCheck) {
            canPerformPostFlight = user?.permissions.includes('Checklists:Complete') ?? false;
        } else {
            canPerformPostFlight = user && activeBookingForSelectedAircraft && 
                (activeBookingForSelectedAircraft.student === user.name || activeBookingForSelectedAircraft.instructor === user.name);
        }
    }
    
    if (isPostFlight && !canPerformPostFlight) {
      return (
        <>
            <div className="mb-4">
                <Button variant="outline" size="sm" onClick={() => handleAircraftSelected(null)}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Change Aircraft
                </Button>
            </div>
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Post-Flight Check Required</AlertTitle>
                <AlertDescription>
                    Only the student or instructor from the previous flight, or a user with checklist completion permissions, can complete the post-flight checklist.
                    A Super User can override this from the main aircraft management view.
                </AlertDescription>
            </Alert>
        </>
      );
    }
    
    return (
      <>
          <div className="mb-4">
              <Button variant="outline" size="sm" onClick={() => handleAircraftSelected(null)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Change Aircraft
              </Button>
          </div>
          { isPostFlight ? (
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
          )}
      </>
    );
  };

  return (
    <main className="flex-1 p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
                <CardTitle>Aircraft Management</CardTitle>
                <CardDescription>View, manage, and perform operations on all aircraft in your fleet.</CardDescription>
            </div>
            <Button onClick={openNewDialog} className="w-full md:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Aircraft
            </Button>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="active">
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-5 h-auto md:h-10">
                    <TabsTrigger value="active">Active Fleet ({activeAircraft.length})</TabsTrigger>
                    <TabsTrigger value="archived">Archived ({archivedAircraft.length})</TabsTrigger>
                    {canViewTechnicalLog && (
                        <TabsTrigger value="technical-log">Technical Log</TabsTrigger>
                    )}
                    <TabsTrigger value="checklists"><CheckCircle2 className="mr-2 h-4 w-4" />Aircraft Checklist</TabsTrigger>
                    <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />Checklist History</TabsTrigger>
                </TabsList>
                <TabsContent value="active" className="mt-4">
                    <AircraftCardList aircraft={activeAircraft} />
                </TabsContent>
                <TabsContent value="archived" className="mt-4">
                     <AircraftCardList aircraft={archivedAircraft} isArchived />
                </TabsContent>
                 <TabsContent value="technical-log" className="mt-4">
                    {canViewTechnicalLog ? (
                        <TechnicalLogView aircraftList={aircraftList} />
                    ) : (
                        <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">You do not have permission to view the technical log.</p>
                        </div>
                    )}
                </TabsContent>
                 <TabsContent value="checklists" className="pt-6 mt-4">
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
                 <TabsContent value="history" className="pt-6 mt-4">
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
                            {getExpiryBadge(viewingDocumentsForAircraft?.airworthinessDoc?.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Insurance Certificate</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.insuranceDoc?.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Certificate of Release to Service</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.releaseToServiceDoc?.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Certificate of Registration</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.registrationDoc?.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Mass & Balance</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.massAndBalanceDoc?.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span>Radio Station License</span>
                            {getExpiryBadge(viewingDocumentsForAircraft?.radioLicenseDoc?.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>

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
