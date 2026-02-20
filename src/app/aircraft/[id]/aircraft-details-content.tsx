'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Wrench, History, CheckCircle2, ChevronDown, Loader2, Download, Eye, ListChecks, FileText, Calendar as CalendarIcon, Clock, Hash, Trash2, Mail, Settings2, PlusCircle, ChevronRight, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { doc, getDoc, collection, query, onSnapshot, orderBy, updateDoc, deleteDoc, writeBatch, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { cn, getExpiryBadge } from '@/lib/utils';
import { useSettings } from '@/context/settings-provider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NewAircraftForm } from '../new-aircraft-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { PreFlightChecklistForm } from '@/app/checklists/pre-flight-checklist-form';
import { PostFlightChecklistForm } from '@/app/checklists/post-flight-checklist-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Loading from '@/app/loading';
import type { Aircraft, Booking, AircraftComponent } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const componentFormSchema = z.object({
  name: z.string().min(1, 'Component name is required.'),
  serialNumber: z.string().min(1, 'Serial number is required.'),
  installDate: z.string().min(1, 'Installation date is required.'),
  installHrs: z.coerce.number().min(0),
  currentHrs: z.coerce.number().min(0),
  tsn: z.coerce.number().min(0),
  tso: z.coerce.number().min(0),
  maxHours: z.coerce.number().min(0),
});

type ComponentFormValues = z.infer<typeof componentFormSchema>;

export function AircraftDetailsContent() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
    const { company, user, loading: userLoading } = useUser();
    const { toast } = useToast();
    const { settings } = useSettings();

    const [aircraft, setAircraft] = useState<Aircraft | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [techReports, setTechReports] = useState<any[]>([]);
    const [components, setComponents] = useState<AircraftComponent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditEditModalOpen] = useState(false);
    const [isAddComponentOpen, setIsAddComponentOpen] = useState(false);
    const [editingComponent, setEditingComponent] = useState<AircraftComponent | null>(null);
    const [rectifyingReport, setRectifyingReport] = useState<any | null>(null);
    const [viewingChecklist, setViewingLog] = useState<any | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);

    const componentForm = useForm<ComponentFormValues>({
        resolver: zodResolver(componentFormSchema),
        defaultValues: {
            name: '',
            serialNumber: '',
            installDate: format(new Date(), 'yyyy-MM-dd'),
            installHrs: 0,
            currentHrs: 0,
            tsn: 0,
            tso: 0,
            maxHours: 0,
        }
    });

    useEffect(() => {
        if (!company || !id) return;

        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, id as string);
        const unsubAircraft = onSnapshot(aircraftRef, (snap) => {
            if (snap.exists()) {
                setAircraft({ id: snap.id, ...snap.data() } as Aircraft);
            } else {
                router.push('/aircraft');
            }
            setLoading(false);
        });

        const historyRef = collection(db, `companies/${company.id}/aircraft/${id}/completed-checklists`);
        const unsubHistory = onSnapshot(query(historyRef, orderBy('dateCompleted', 'desc')), (snap) => {
            setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const unsubTech = onSnapshot(query(collection(db, `companies/${company.id}/technical-reports`), orderBy('dateReported', 'desc')), (snap) => {
            setTechReports(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.aircraftRegistration === aircraft?.tailNumber));
        });
        
        const unsubBookings = onSnapshot(query(collection(db, `companies/${company.id}/aircraft-bookings`)), (snap) => {
            setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
        });

        const unsubComponents = onSnapshot(collection(db, `companies/${company.id}/aircraft/${id}/components`), (snap) => {
            setComponents(snap.docs.map(d => ({ id: d.id, ...d.data() } as AircraftComponent)));
        });

        return () => {
            unsubAircraft();
            unsubHistory();
            unsubTech();
            unsubBookings();
            unsubComponents();
        };
    }, [company, id, router, aircraft?.tailNumber]);

    const activeBooking = useMemo(() => {
        if (!aircraft?.activeBookingId) return null;
        return bookings.find(b => b.id === aircraft.activeBookingId);
    }, [bookings, aircraft?.activeBookingId]);

    const handleRectifyReport = async (formData: any) => {
        if (!rectifyingReport || !company) return;
        const reportRef = doc(db, `companies/${company.id}/technical-reports`, rectifyingReport.id);
        try {
            await updateDoc(reportRef, {
                ...formData,
                status: 'Rectified',
                rectificationDate: new Date().toISOString(),
                rectifiedBy: user?.name,
            });
            setRectifyingReport(null);
            toast({ title: 'Report Rectified', description: 'Technical log has been updated.' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Update Failed' });
        }
    };

    const handleAddComponent = async (data: ComponentFormValues) => {
        if (!company || !id) return;
        try {
            if (editingComponent) {
                const compRef = doc(db, `companies/${company.id}/aircraft/${id}/components`, editingComponent.id);
                await updateDoc(compRef, data);
                toast({ title: 'Component Updated' });
            } else {
                await addDoc(collection(db, `companies/${company.id}/aircraft/${id}/components`), data);
                toast({ title: 'Component Added' });
            }
            setIsAddComponentOpen(false);
            setEditingComponent(null);
            componentForm.reset();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save component.' });
        }
    };

    const handleDeleteComponent = async (compId: string) => {
        if (!company || !id) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/aircraft/${id}/components`, compId));
            toast({ title: 'Component Removed' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Delete Failed' });
        }
    }

    const handleChecklistSuccess = async (data: any) => {
        if (!aircraft || !company || !user) return;
        const isPreFlight = 'registration' in data;
        const batch = writeBatch(db);
        const aircraftRef = doc(db, `companies/${company.id}/aircraft`, aircraft.id);
        const booking = activeBooking;

        try {
            const historyRef = doc(collection(db, `companies/${company.id}/aircraft/${aircraft.id}/completed-checklists`));
            batch.set(historyRef, {
                aircraftId: aircraft.id,
                aircraftTailNumber: aircraft.tailNumber,
                userId: user.id,
                userName: user.name,
                dateCompleted: new Date().toISOString(),
                type: isPreFlight ? 'Pre-Flight' : 'Post-Flight',
                results: data,
                bookingNumber: booking?.bookingNumber,
            });

            if (isPreFlight) {
                batch.update(aircraftRef, { checklistStatus: 'needs-post-flight' });
                if (booking) {
                    const bookingRef = doc(db, `companies/${company.id}/aircraft-bookings`, booking.id);
                    batch.update(bookingRef, { startHobbs: data.hobbs });
                }
            } else {
                const flightDuration = booking?.startHobbs ? parseFloat((data.hobbs - booking.startHobbs).toFixed(1)) : 0;
                batch.update(aircraftRef, { 
                    checklistStatus: 'ready', 
                    activeBookingId: null,
                    hours: data.hobbs,
                    currentTachoReading: data.tacho
                });
                if (booking) {
                    const bookingRef = doc(db, `companies/${company.id}/aircraft-bookings`, booking.id);
                    batch.update(bookingRef, { status: 'Completed', endHobbs: data.hobbs, flightDuration });
                }
            }
            await batch.commit();
            toast({ title: 'Checklist Submitted' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error submitting checklist' });
        }
    };

    const handleDeleteChecklist = async (cid: string) => {
        if (!company || !id) return;
        try {
            await deleteDoc(doc(db, `companies/${company.id}/aircraft/${id}/completed-checklists`, cid));
            toast({ title: 'Record Deleted' });
        } catch (e) {
            toast({ variant: 'destructive', title: 'Delete Failed' });
        }
    };

    if (loading || userLoading) return <Loading />;
    if (!aircraft) return <div className="p-8 text-center"><p>Aircraft not found.</p></div>;

    const hoursUntil50 = aircraft.next50HourInspection ? (aircraft.next50HourInspection - (aircraft.currentTachoReading || 0)) : -1;
    const hoursUntil100 = aircraft.next100HourInspection ? (aircraft.next100HourInspection - (aircraft.currentTachoReading || 0)) : -1;

    return (
        <main className="flex-1 p-4 md:p-8 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/aircraft')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-bold tracking-tight">{aircraft.tailNumber}</h1>
                            <Badge variant={aircraft.status === 'Available' ? 'success' : 'warning'}>{aircraft.status}</Badge>
                        </div>
                        <p className="text-muted-foreground">{aircraft.make} {aircraft.model}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={() => setIsEditEditModalOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 border overflow-x-auto whitespace-nowrap">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="maintenance">Maintenance & Tech Log</TabsTrigger>
                    <TabsTrigger value="history">Checklist History</TabsTrigger>
                    <TabsTrigger value="documents">Documentation</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="checklists" className="text-primary font-semibold">Perform Checklist</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Airframe Hours</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{aircraft.hours.toFixed(1)}</div>
                                <p className="text-xs text-muted-foreground mt-1">Hobbs reading</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Current Tacho</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{aircraft.currentTachoReading?.toFixed(1) || 'N/A'}</div>
                                <p className="text-xs text-muted-foreground mt-1">Maintenance reference</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Next 50hr Insp.</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={cn("text-2xl font-bold", hoursUntil50 < 5 && "text-destructive")}>
                                    {hoursUntil50 >= 0 ? `${hoursUntil50.toFixed(1)}h` : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Remaining</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Next 100hr Insp.</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={cn("text-2xl font-bold", hoursUntil100 < 10 && "text-destructive")}>
                                    {hoursUntil100 >= 0 ? `${hoursUntil100.toFixed(1)}h` : 'N/A'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Remaining</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Current Status</CardTitle>
                                <CardDescription>Operational availability and current location.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("h-3 w-3 rounded-full", aircraft.status === 'Available' ? "bg-green-500" : "bg-orange-500")} />
                                        <span className="font-semibold">{aircraft.status}</span>
                                    </div>
                                    <Badge variant="outline">Base: {aircraft.location}</Badge>
                                </div>
                                {activeBooking && (
                                    <div className="p-4 border rounded-lg border-primary/20 bg-primary/5">
                                        <h4 className="font-semibold text-primary mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Active Booking</h4>
                                        <div className="text-sm grid grid-cols-2 gap-2">
                                            <p><span className="text-muted-foreground">Number:</span> {activeBooking.bookingNumber}</p>
                                            <p><span className="text-muted-foreground">Crew:</span> {activeBooking.student || activeBooking.pilotName}</p>
                                            <p><span className="text-muted-foreground">Times:</span> {activeBooking.startTime} - {activeBooking.endTime}</p>
                                            <p><span className="text-muted-foreground">Stage:</span> {aircraft.checklistStatus === 'needs-post-flight' ? 'In Flight / Needs Post-Flight' : 'Ready for Pre-Flight'}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Tech Reports</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {techReports.slice(0, 3).map(report => (
                                    <div key={report.id} className="text-sm p-3 border rounded-lg">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold">{report.reportNumber}</span>
                                            <Badge variant={report.status === 'Rectified' ? 'success' : 'warning'} className="text-[10px] h-4 px-1">{report.status || 'Open'}</Badge>
                                        </div>
                                        <p className="line-clamp-1 text-muted-foreground">{report.description}</p>
                                    </div>
                                ))}
                                {techReports.length === 0 && <p className="text-sm text-muted-foreground text-center py-4 italic">No issues reported recently.</p>}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="maintenance" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Technical Log & Defect History</CardTitle>
                            <CardDescription>Comprehensive record of all reported defects and their rectifications.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[600px] pr-4">
                                <div className="space-y-4">
                                    {techReports.map(report => (
                                        <Collapsible key={report.id} className="border rounded-lg overflow-hidden">
                                            <CollapsibleTrigger asChild>
                                                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("p-2 rounded-full", report.status === 'Rectified' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600")}>
                                                            <Wrench className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold">{report.reportNumber}: {report.description}</p>
                                                            <p className="text-xs text-muted-foreground">{format(parseISO(report.dateReported), 'PPP')} • {report.component}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Badge variant={report.status === 'Rectified' ? 'success' : 'warning'}>{report.status || 'Open'}</Badge>
                                                        {report.status !== 'Rectified' && (
                                                            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setRectifyingReport(report); }}>Rectify</Button>
                                                        )}
                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent className="p-4 bg-muted/20 border-t space-y-4">
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                    <div><p className="font-medium text-muted-foreground uppercase text-[10px]">Reported By</p><p>{report.reportedBy}</p></div>
                                                    <div><p className="font-medium text-muted-foreground uppercase text-[10px]">System</p><p>{report.component}</p></div>
                                                    <div><p className="font-medium text-muted-foreground uppercase text-[10px]">Component</p><p>{report.subcomponent || report.otherComponent || 'N/A'}</p></div>
                                                </div>
                                                {report.rectificationDate && (
                                                    <div className="pt-4 mt-4 border-t space-y-4">
                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                                            <div><p className="font-medium text-muted-foreground uppercase text-[10px]">Rectified By</p><p>{report.rectifiedBy}</p></div>
                                                            <div><p className="font-medium text-muted-foreground uppercase text-[10px]">Date</p><p>{format(parseISO(report.rectificationDate), 'PPP p')}</p></div>
                                                            <div><p className="font-medium text-muted-foreground uppercase text-[10px]">Log Entry #</p><p>{report.physicalLogEntry || 'N/A'}</p></div>
                                                        </div>
                                                        <div><p className="font-medium text-muted-foreground uppercase text-[10px]">Work Details</p><p className="p-2 bg-background rounded-md border text-sm mt-1">{report.rectificationDetails}</p></div>
                                                    </div>
                                                )}
                                            </CollapsibleContent>
                                        </Collapsible>
                                    ))}
                                    {techReports.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-lg">
                                            <p className="text-muted-foreground font-semibold text-lg">Clean Technical Log</p>
                                            <p className="text-sm text-muted-foreground">No defects have been recorded for this aircraft.</p>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Checklist Audit Trail</CardTitle>
                                <CardDescription>Historical record of all operational checks performed on this aircraft.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Check Type</TableHead>
                                        <TableHead>User</TableHead>
                                        <TableHead>Booking Ref</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{format(parseISO(item.dateCompleted), 'dd MMM yyyy HH:mm')}</TableCell>
                                            <TableCell><Badge variant="outline">{item.type}</Badge></TableCell>
                                            <TableCell>{item.userName}</TableCell>
                                            <TableCell>{item.bookingNumber || '-'}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="ghost" size="sm" onClick={() => setViewingLog(item)}><Eye className="h-4 w-4 mr-2" /> View</Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Delete Record?</AlertDialogTitle><AlertDialogDescription>This will permanently remove this checklist entry from the audit trail.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteChecklist(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {history.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground italic">No history found.</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Certificate Tracking</CardTitle>
                            <CardDescription>Regulatory documentation and validity monitoring.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                {[
                                    { label: 'Certificate of Airworthiness', date: aircraft.airworthinessDoc?.expiryDate },
                                    { label: 'Insurance Certificate', date: aircraft.insuranceDoc?.expiryDate },
                                    { label: 'Certificate of Release to Service', date: aircraft.releaseToServiceDoc?.expiryDate },
                                ].map(doc => (
                                    <div key={doc.label} className="flex items-center justify-between p-3 border rounded-lg">
                                        <span className="text-sm font-medium">{doc.label}</span>
                                        {getExpiryBadge(doc.date, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                {[
                                    { label: 'Certificate of Registration', date: aircraft.registrationDoc?.expiryDate },
                                    { label: 'Mass & Balance Schedule', date: aircraft.massAndBalanceDoc?.expiryDate },
                                    { label: 'Radio Station License', date: aircraft.radioLicenseDoc?.expiryDate },
                                ].map(doc => (
                                    <div key={doc.label} className="flex items-center justify-between p-3 border rounded-lg">
                                        <span className="text-sm font-medium">{doc.label}</span>
                                        {getExpiryBadge(doc.date, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="components" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Component Registry</CardTitle>
                                <CardDescription>Tracking lifecycle and maintenance data for major aircraft components.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => { setEditingComponent(null); componentForm.reset(); setIsAddComponentOpen(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Component
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Component Name</TableHead>
                                        <TableHead>Serial Number</TableHead>
                                        <TableHead>Install Date</TableHead>
                                        <TableHead>Hrs at Install</TableHead>
                                        <TableHead>TSN</TableHead>
                                        <TableHead>TSO</TableHead>
                                        <TableHead className="text-right">Max Hours</TableHead>
                                        <TableHead className="text-right no-print">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {components.map((comp) => (
                                        <TableRow key={comp.id}>
                                            <TableCell className="font-medium">{comp.name}</TableCell>
                                            <TableCell className="font-mono text-xs">{comp.serialNumber}</TableCell>
                                            <TableCell>{format(parseISO(comp.installDate), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{comp.installHrs.toFixed(1)}</TableCell>
                                            <TableCell className="font-semibold">{comp.tsn.toFixed(1)}</TableCell>
                                            <TableCell className="font-semibold">{comp.tso.toFixed(1)}</TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {comp.maxHours?.toFixed(1) || '0.0'}
                                            </TableCell>
                                            <TableCell className="text-right no-print space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => {
                                                    setEditingComponent(comp);
                                                    componentForm.reset(comp);
                                                    setIsAddComponentOpen(true);
                                                }}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteComponent(comp.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {components.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center h-24 text-muted-foreground italic">No components registered.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="checklists" className="mt-6 max-w-2xl mx-auto space-y-6">
                    {aircraft.checklistStatus === 'needs-post-flight' ? (
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader>
                                <CardTitle className="text-primary flex items-center gap-2"><Clock className="h-5 w-5" /> Post-Flight Due</CardTitle>
                                <CardDescription>A post-flight check is outstanding for the previous booking.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PostFlightChecklistForm 
                                    onSuccess={handleChecklistSuccess}
                                    aircraft={aircraft}
                                    startHobbs={activeBooking?.startHobbs}
                                    onReportIssue={() => {}}
                                />
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pre-Flight Operation</CardTitle>
                                <CardDescription>Complete the flight dispatch requirements for {aircraft.tailNumber}.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PreFlightChecklistForm 
                                    onSuccess={handleChecklistSuccess} 
                                    aircraft={aircraft}
                                    onReportIssue={() => {}}
                                    onCancelBooking={() => {}}
                                    initialHobbs={aircraft.hours}
                                    booking={activeBooking}
                                    onEditBooking={() => {}}
                                />
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            <Dialog open={isEditModalOpen} onOpenChange={setIsEditEditModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Aircraft Profile</DialogTitle>
                    </DialogHeader>
                    <NewAircraftForm onSuccess={() => setIsEditEditModalOpen(false)} initialData={aircraft} />
                </DialogContent>
            </Dialog>

            <Dialog open={!!rectifyingReport} onOpenChange={() => setRectifyingReport(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rectify Defect: {rectifyingReport?.reportNumber}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); handleRectifyReport(Object.fromEntries(new FormData(e.currentTarget).entries())); }} className="space-y-4 py-4">
                        <div className="space-y-2"><Label>Work Performed</Label><Textarea name="rectificationDetails" required /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label>Components Replaced</Label><Input name="componentsReplaced" /></div>
                            <div className="space-y-2"><Label>Physical Log Entry #</Label><Input name="physicalLogEntry" required /></div>
                        </div>
                        <DialogFooter><Button type="submit">Finalize & Close Report</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddComponentOpen} onOpenChange={setIsAddComponentOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingComponent ? 'Edit Component' : 'Add Aircraft Component'}</DialogTitle>
                        <DialogDescription>Enter the tracking data for a major airframe or powerplant component.</DialogDescription>
                    </DialogHeader>
                    <Form {...componentForm}>
                        <form onSubmit={componentForm.handleSubmit(handleAddComponent)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={componentForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Component Name</FormLabel><FormControl><Input placeholder="e.g. Engine" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={componentForm.control} name="serialNumber" render={({ field }) => (<FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="S/N" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={componentForm.control} name="installDate" render={({ field }) => (<FormItem><FormLabel>Install Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={componentForm.control} name="installHrs" render={({ field }) => (<FormItem><FormLabel>Hrs at Install</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={componentForm.control} name="currentHrs" render={({ field }) => (<FormItem><FormLabel>Total Airframe Hrs</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={componentForm.control} name="maxHours" render={({ field }) => (<FormItem><FormLabel>Max Hours (TBO)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={componentForm.control} name="tsn" render={({ field }) => (<FormItem><FormLabel>TSN (Time Since New)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={componentForm.control} name="tso" render={({ field }) => (<FormItem><FormLabel>TSO (Time Since Overhaul)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                            <DialogFooter><Button type="submit">{editingComponent ? 'Update Component' : 'Register Component'}</Button></DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {viewingChecklist && (
                <Dialog open={!!viewingChecklist} onOpenChange={() => setViewingLog(null)}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{viewingChecklist.type} Checklist: {viewingChecklist.aircraftTailNumber}</DialogTitle>
                            <DialogDescription>Completed by {viewingChecklist.userName} on {format(parseISO(viewingChecklist.dateCompleted), 'PPP p')}</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh] pr-4">
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-3 border rounded-lg"><p className="text-muted-foreground uppercase text-[10px]">Hobbs Reading</p><p className="text-xl font-bold">{viewingChecklist.results.hobbs}</p></div>
                                    <div className="p-3 border rounded-lg"><p className="text-muted-foreground uppercase text-[10px]">Tacho Reading</p><p className="text-xl font-bold">{viewingChecklist.results.tacho || 'N/A'}</p></div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-sm">Reported Observations</h4>
                                    <p className="text-sm p-3 bg-muted rounded-lg">{viewingChecklist.results.report || 'No issues reported.'}</p>
                                </div>
                                {viewingChecklist.results.leftSidePhoto && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1"><p className="text-xs font-medium">Left Side</p><Image src={viewingChecklist.results.leftSidePhoto} alt="Left" width={400} height={225} className="rounded-lg border" /></div>
                                        {viewingChecklist.results.rightSidePhoto && <div className="space-y-1"><p className="text-xs font-medium">Right Side</p><Image src={viewingChecklist.results.rightSidePhoto} alt="Right" width={400} height={225} className="rounded-lg border" /></div>}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>
            )}
        </main>
    );
}