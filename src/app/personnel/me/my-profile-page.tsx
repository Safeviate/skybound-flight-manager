

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUser } from '@/context/user-provider';
import type { Booking, TrainingLogEntry, User, UserDocument, ThemeColors } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Mail, Phone, Home, User as UserIcon, Edit, Cog, Camera, FileUp, ImageIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getExpiryBadge } from '@/lib/utils';
import { useSettings } from '@/context/settings-provider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardCamera } from '@/components/ui/standard-camera';
import { useToast } from '@/hooks/use-toast';
import { updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { ALL_DOCUMENTS } from '@/lib/types';

const formatDecimalTime = (decimalHours: number | undefined) => {
    if (typeof decimalHours !== 'number' || isNaN(decimalHours)) {
        return '0.0';
    }
    return decimalHours.toFixed(1);
};

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const MAX_FILE_SIZE = 500000; // 500KB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().regex(phoneRegex, 'Invalid Number!'),
  homeAddress: z.string().optional(),
  nextOfKinName: z.string().optional(),
  nextOfKinPhone: z.string().regex(phoneRegex, 'Invalid Number!').optional().or(z.literal('')),
  nextOfKinEmail: z.string().email().optional().or(z.literal('')),
  documents: z.array(z.object({
      id: z.string(),
      type: z.string(),
      expiryDate: z.date().nullable().optional(),
      url: z.string().optional().nullable(),
      file: z.any().optional(),
  })).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
    newPassword: z.string().min(6, 'Password must be at least 6 characters long.'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
});

type PasswordFormValues = z.infer<typeof passwordFormSchema>;


const ProfileDialog = ({ user, isOpen, onOpenChange, updateUser }: { user: User, isOpen: boolean, onOpenChange: (open: boolean) => void, updateUser: (data: Partial<User>) => Promise<boolean> }) => {
    const { toast } = useToast();
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [photoTarget, setPhotoTarget] = useState<string | null>(null);

    const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileFormSchema) });
    const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordFormSchema) });

    const { setValue, watch } = profileForm;

    const handleFileChange = useCallback((file: File, index: number) => {
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                toast({ variant: 'destructive', title: 'File too large', description: 'Maximum file size is 500KB.' });
                return;
            }
            if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
                toast({ variant: 'destructive', title: 'Invalid file type', description: 'Only JPG, PNG, and WEBP are accepted.' });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setValue(`documents.${index}.url`, reader.result as string, { shouldValidate: true });
            };
            reader.readAsDataURL(file);
        }
    }, [setValue, toast]);

    const handlePhotoSuccess = (dataUrl: string) => {
        if (photoTarget) {
            setValue(photoTarget as any, dataUrl, { shouldValidate: true });
        }
        setIsCameraOpen(false);
        setPhotoTarget(null);
    };

    const openCamera = (targetField: string) => {
        setPhotoTarget(targetField);
        setIsCameraOpen(true);
    };

    const getCombinedDocuments = useCallback(() => {
        if (!user) return [];
        const requiredDocTypes = new Set(ALL_DOCUMENTS);
        const existingDocs = user.documents || [];
        const combined = new Map<string, UserDocument>();
        
        requiredDocTypes.forEach(type => {
            const existing = existingDocs.find(d => d.type === type);
            if (existing) { combined.set(type, existing); } 
            else { combined.set(type, { id: `new-${type}-${Date.now()}`, type, expiryDate: null }); }
        });
        
        existingDocs.forEach(doc => { if (!combined.has(doc.type)) { combined.set(doc.type, doc); } });
        
        return Array.from(combined.values());
    }, [user]);

    useEffect(() => {
        if (user && isOpen) {
            const combinedDocs = getCombinedDocuments();
            profileForm.reset({
                name: user.name,
                phone: user.phone,
                homeAddress: user.homeAddress || '',
                nextOfKinName: user.nextOfKinName || '',
                nextOfKinPhone: user.nextOfKinPhone || '',
                nextOfKinEmail: user.nextOfKinEmail || '',
                documents: combinedDocs.map(d => ({ ...d, expiryDate: d.expiryDate ? parseISO(d.expiryDate) : null, file: null })),
            });
            passwordForm.reset();
        }
    }, [user, profileForm, passwordForm, isOpen, getCombinedDocuments]);

    const handleProfileUpdate = async (data: ProfileFormValues) => {
        const updatedDocs = (data.documents || []).map(d => ({
            id: d.id, type: d.type,
            expiryDate: d.expiryDate ? format(d.expiryDate, 'yyyy-MM-dd') : null,
            url: d.url || undefined
        }));

        const success = await updateUser({
            name: data.name, phone: data.phone, homeAddress: data.homeAddress,
            nextOfKinName: data.nextOfKinName, nextOfKinPhone: data.nextOfKinPhone,
            nextOfKinEmail: data.nextOfKinEmail, documents: updatedDocs as UserDocument[],
        });
        if (success) { toast({ title: 'Profile Updated' }); onOpenChange(false); }
        else { toast({ variant: 'destructive', title: 'Update Failed' }); }
    };
    
    const handleChangePassword = async (data: PasswordFormValues) => {
        const currentUser = auth.currentUser;
        if (!currentUser) { toast({ variant: 'destructive', title: 'Error', description: 'Not authenticated.' }); return; }
        try {
            await updatePassword(currentUser, data.newPassword);
            toast({ title: 'Password Updated'});
            passwordForm.reset();
            onOpenChange(false);
        } catch (error) { toast({ variant: 'destructive', title: 'Error', description: 'Failed to update password.' }); }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle>My Personal Information</DialogTitle>
                    <DialogDescription>Update your contact details and view required documents.</DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="personal">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="personal">Personal Info</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                    </TabsList>
                    <TabsContent value="personal">
                        <Form {...profileForm}>
                            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)}>
                                <ScrollArea className="h-[60vh] pr-6"><div className="space-y-4 pt-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                        <div className="space-y-4">
                                            <h4 className="font-medium text-sm">Personal Details</h4>
                                            <FormField control={profileForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormItem><Label>Email</Label><Input value={user?.email || ''} disabled /></FormItem>
                                            <FormField control={profileForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormDescription>Example: +27 12 345 6789</FormDescription><FormMessage /></FormItem>)} />
                                            <FormField control={profileForm.control} name="homeAddress" render={({ field }) => (<FormItem><FormLabel>Home Address</FormLabel><FormControl><Input placeholder="123 Main St, Anytown, USA" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-medium text-sm">Next of Kin Details</h4>
                                            <FormField control={profileForm.control} name="nextOfKinName" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={profileForm.control} name="nextOfKinPhone" render={({ field }) => (<FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="555-987-6543" {...field} /></FormControl><FormDescription>Example: +27 12 345 6789</FormDescription><FormMessage /></FormItem>)} />
                                            <FormField control={profileForm.control} name="nextOfKinEmail" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="jane.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                    </div>
                                </div></ScrollArea>
                                <DialogFooter className="pt-4 mt-4 border-t">
                                    <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                                    <Button type="submit">Save Changes</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="documents">
                        <Form {...profileForm}>
                            <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)}>
                               <ScrollArea className="h-[60vh] pr-6"><div className="space-y-4 pt-4">
                                   <h4 className="font-medium text-sm mb-2 flex items-center gap-2"><FileUp className="h-4 w-4 text-muted-foreground" />My Documents</h4>
                                   <div className="space-y-4">
                                       {(profileForm.watch('documents') || []).map((docItem, index) => {
                                          const documentUrl = watch(`documents.${index}.url`);
                                          return (
                                             <div key={docItem.id} className="p-4 border rounded-lg space-y-3">
                                                <p className="font-medium text-sm">{docItem.type}</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                   <FormField control={profileForm.control} name={`documents.${index}.expiryDate`} render={({ field }) => { const typedField = field as unknown as { value: Date | null | undefined, onChange: (date: Date | undefined) => void }; return (<FormItem><FormLabel className="sr-only">Expiry Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !typedField.value && "text-muted-foreground")}>{typedField.value ? format(typedField.value, "PPP") : <span>Set expiry date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={typedField.value || undefined} onSelect={typedField.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)}} />
                                                   <div className="flex items-center gap-2">
                                                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openCamera(`documents.${index}.url`)}><Camera className="mr-2 h-4 w-4" /> Take Photo</Button>
                                                      <FormField control={profileForm.control} name={`documents.${index}.file`} render={({ field }) => (<FormItem className="flex-1"><FormControl><div className="relative"><Button type="button" variant="outline" asChild size="sm" className="w-full"><label htmlFor={`doc-file-${index}`} className="cursor-pointer"><FileUp className="mr-2 h-4 w-4" /> {documentUrl ? 'Change' : 'Upload'}</label></Button><Input id={`doc-file-${index}`} type="file" accept="image/*" className="absolute w-0 h-0 opacity-0" onChange={(e) => e.target.files && handleFileChange(e.target.files[0], index)} /></div></FormControl><FormMessage /></FormItem>)} />
                                                   </div>
                                                </div>
                                             </div>
                                          )
                                       })}
                                       {(profileForm.getValues('documents') || []).length === 0 && (<p className="text-sm text-muted-foreground">No specific documents have been requested.</p>)}
                                   </div>
                               </div></ScrollArea>
                                <DialogFooter className="pt-4 mt-4 border-t">
                                    <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                                    <Button type="submit">Save Changes</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                    <TabsContent value="security">
                        <Form {...passwordForm}>
                            <form onSubmit={passwordForm.handleSubmit(handleChangePassword)} className="space-y-6 pt-4">
                                <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (<FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                 <DialogFooter className="pt-4">
                                    <DialogClose asChild><Button type="button" variant="secondary">Close</Button></DialogClose>
                                    <Button type="submit">Set New Password</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </TabsContent>
                </Tabs>
                <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                    <DialogContent><DialogHeader><DialogTitle>Take Photo</DialogTitle><DialogDescription>Take a picture of the document.</DialogDescription></DialogHeader><StandardCamera onSuccess={handlePhotoSuccess} /></DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}

export function MyProfilePageContent({ user: initialUser, bookings: initialBookings }: { user: User; bookings: Booking[] }) {
  const { user, updateUser, company, loading: userLoading } = useUser();
  const { settings } = useSettings();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const instructorLogbookEntries = useMemo(() => {
    if (!initialUser || !initialBookings) return [];
    return initialBookings
      .filter(booking => booking.status === 'Completed' && booking.instructor === initialUser.name)
      .map(booking => ({
        id: booking.id, date: booking.date, aircraft: booking.aircraft,
        student: booking.student || 'N/A', flightDuration: booking.flightDuration || 0,
        startHobbs: booking.startHobbs || 0, endHobbs: booking.endHobbs || 0,
        trainingExercise: booking.trainingExercise || 'N/A',
      }))
      .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
  }, [initialBookings, initialUser]);

  const handleDownloadLogbook = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16); doc.text(`Instructor Logbook: ${user?.name}`, 14, 15);
    doc.setFontSize(10); doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 22);

    const tableBody = instructorLogbookEntries.map(log => [
        format(parseISO(log.date), 'dd/MM/yyyy'), log.aircraft, log.student,
        log.trainingExercise, log.startHobbs.toFixed(1), log.endHobbs.toFixed(1),
        log.flightDuration.toFixed(1),
    ]);

    autoTable(doc, {
        startY: 30, head: [['Date', 'Aircraft', 'Student', 'Exercise', 'Start Hobbs', 'End Hobbs', 'Duration']],
        body: tableBody, theme: 'grid', headStyles: { fillColor: [22, 163, 74] },
    });
    
    doc.save(`${user?.name.replace(/\s+/g, '_')}_instructor_logbook.pdf`);
  };
  
  if (!user) {
    return null;
  }
  
  return (
    <>
    <main className="flex-1 p-4 md:p-8 space-y-8">
      <Tabs defaultValue="profile">
        <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="logbook">Instructor Logbook</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="mt-4 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
             <Card className="lg:col-span-1">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <CardTitle>{user.name}</CardTitle>
                        <Button variant="outline" size="sm" onClick={() => setIsProfileOpen(true)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Profile
                        </Button>
                    </div>
                    <CardDescription>{user.role} | {user.department}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                   <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{user.email}</span></div>
                   <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{user.phone}</span></div>
                   <div className="flex items-center gap-3"><Home className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{user.homeAddress || 'No address on file'}</span></div>
                </CardContent>
             </Card>
             <Card className="lg:col-span-1">
                <CardHeader><CardTitle>Emergency Contact</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center gap-3"><UserIcon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{user.nextOfKinName || 'N/A'} ({user.nextOfKinRelation || 'N/A'})</span></div>
                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{user.nextOfKinPhone || 'N/A'}</span></div>
                    <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{user.nextOfKinEmail || 'N/A'}</span></div>
                </CardContent>
             </Card>
              <Card className="lg:col-span-1">
                <CardHeader><CardTitle>Document Status</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    {(user.documents || []).length > 0 ? (
                        user.documents?.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <span>{doc.type}</span>
                            {getExpiryBadge(doc.expiryDate, settings.expiryWarningOrangeDays, settings.expiryWarningYellowDays)}
                        </div>
                        ))
                    ) : (<p className="text-sm text-muted-foreground">No documents on file.</p>)}
                </CardContent>
             </Card>
             <Card className="md:col-span-2 lg:col-span-3">
                 <CardHeader><CardTitle>Assigned Permissions</CardTitle><CardDescription>Based on your role of <span className="font-semibold">{user.role}</span>, you have the following permissions:</CardDescription></CardHeader>
                 <CardContent><div className="flex flex-wrap gap-2">{user.permissions.sort().map(permission => (<Badge key={permission} variant="secondary">{permission}</Badge>))}</div></CardContent>
             </Card>
        </TabsContent>
         <TabsContent value="logbook" className="mt-4">
            <Card>
                <CardHeader className="flex-row justify-between items-start">
                    <div><CardTitle>My Instructor Logbook</CardTitle><CardDescription>A record of all completed instructional flights.</CardDescription></div>
                    <Button variant="outline" onClick={handleDownloadLogbook}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                </CardHeader>
                <CardContent>
                    <ScrollArea>
                        <Table>
                            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Aircraft</TableHead><TableHead>Student</TableHead><TableHead>Exercise</TableHead><TableHead>Start Hobbs</TableHead><TableHead>End Hobbs</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {instructorLogbookEntries.length > 0 ? (
                                    instructorLogbookEntries.map(log => (
                                        <TableRow key={log.id}><TableCell>{format(parseISO(log.date), 'PPP')}</TableCell><TableCell>{log.aircraft}</TableCell><TableCell>{log.student}</TableCell><TableCell>{log.trainingExercise}</TableCell><TableCell>{log.startHobbs.toFixed(1)}</TableCell><TableCell>{log.endHobbs.toFixed(1)}</TableCell><TableCell>{log.flightDuration.toFixed(1)}</TableCell></TableRow>
                                    ))
                                ) : (<TableRow><TableCell colSpan={7} className="h-24 text-center">No completed instructional flights found.</TableCell></TableRow>)}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </main>
    <ProfileDialog user={user} isOpen={isProfileOpen} onOpenChange={setIsProfileOpen} updateUser={updateUser} />
    </>
  );
}
