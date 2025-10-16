
'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, FileUp, Building, Check, Users, Repeat, Cog, PanelLeft, KeyRound, UserCircle, Camera, ImageIcon } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { UserDocument, User as AppUser, ThemeColors } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db, auth } from '@/lib/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { StandardCamera } from '../ui/standard-camera';

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


export default function Header({ title, children }: { title: string, children?: React.ReactNode }) {
  const { user, company, userCompanies, setCompany, logout, updateUser } = useUser();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const { toast } = useToast();
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [photoTarget, setPhotoTarget] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });
  
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
  });
  
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

    const requiredDocTypes = new Set(user.requiredDocuments || []);
    const existingDocs = user.documents || [];
    
    const combined = new Map<string, UserDocument>();

    requiredDocTypes.forEach(type => {
        const existing = existingDocs.find(d => d.type === type);
        if (existing) {
            combined.set(type, existing);
        } else {
            combined.set(type, { id: `new-${type}-${Date.now()}`, type, expiryDate: null });
        }
    });

    existingDocs.forEach(doc => {
        if (!combined.has(doc.type)) {
            combined.set(doc.type, doc);
        }
    });

    return Array.from(combined.values());
  }, [user]);

  useEffect(() => {
    if (user && isProfileOpen) {
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
  }, [user, profileForm, passwordForm, isProfileOpen, getCombinedDocuments]);

  const handleLogout = () => {
    logout();
  };

  const handleProfileUpdate = async (data: ProfileFormValues) => {
    if (!user) return;
    
    const updatedDocs = (data.documents || []).map(d => ({
        id: d.id,
        type: d.type,
        expiryDate: d.expiryDate ? format(d.expiryDate, 'yyyy-MM-dd') : null,
        url: d.url || undefined
    }));

    const success = await updateUser({
      name: data.name,
      phone: data.phone,
      homeAddress: data.homeAddress,
      nextOfKinName: data.nextOfKinName,
      nextOfKinPhone: data.nextOfKinPhone,
      nextOfKinEmail: data.nextOfKinEmail,
      documents: updatedDocs as UserDocument[],
    });

    if (success) {
      toast({ title: 'Profile Updated', description: 'Your information has been successfully saved.' });
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your changes.' });
    }
  };

  const handleChangePassword = async (data: PasswordFormValues) => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          toast({ variant: 'destructive', title: 'Error', description: 'Not authenticated.' });
          return;
      }
      try {
          await updatePassword(currentUser, data.newPassword);
          toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
          passwordForm.reset();
      } catch (error) {
          console.error(error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to update password. You may need to log out and log back in.' });
      }
  }
  
  const handleSwitchCompany = (newCompanyId: string) => {
    const newCompany = userCompanies.find(c => c.id === newCompanyId);
    if (newCompany && newCompany.id !== company?.id) {
        setCompany(newCompany);
        router.push('/my-dashboard'); 
    }
    setIsSwitcherOpen(false);
  }

  return (
    <>
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8 no-print">
      <div className="flex items-center flex-1">
        <div className="md:hidden">
            <SidebarTrigger>
                <PanelLeft />
            </SidebarTrigger>
        </div>
        <h1 className="text-xl font-semibold md:text-2xl whitespace-nowrap text-[var(--header-foreground)] ml-4">{title}</h1>
      </div>
      
      <div className="flex-1 text-center">
        <span className="text-lg font-bold text-muted-foreground">{company?.name || 'Safeviate'}</span>
      </div>
      
      <div className="flex items-center justify-end gap-4 flex-1">
        {children}
        <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="default" className="relative h-auto px-4 py-2 text-left">
                      <div className="flex flex-col">
                          <span>{user?.name}</span>
                          <span className="text-xs text-primary-foreground/80 -mt-1">{user?.role}</span>
                      </div>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <div className="text-xs text-muted-foreground">Active Company: <strong>{company?.name}</strong></div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setIsProfileOpen(true)}>
                      <Cog className="mr-2 h-4 w-4" />
                      <span>Edit Personal Info</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>My Personal Information</DialogTitle>
              <DialogDescription>
                Update your contact details and view required documents.
              </DialogDescription>
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
                            <ScrollArea className="h-[60vh] pr-6">
                            <div className="space-y-4 pt-4">
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
                            </div>
                            </ScrollArea>
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
                       <ScrollArea className="h-[60vh] pr-6">
                         <div className="space-y-4 pt-4">
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
                                              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => openCamera(`documents.${index}.url`)}>
                                                    <Camera className="mr-2 h-4 w-4" /> Take Photo
                                              </Button>
                                              <FormField
                                                    control={profileForm.control}
                                                    name={`documents.${index}.file`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Button type="button" variant="outline" asChild size="sm" className="w-full">
                                                                        <label htmlFor={`doc-file-${index}`} className="cursor-pointer">
                                                                            <FileUp className="mr-2 h-4 w-4" />
                                                                            {documentUrl ? 'Change' : 'Upload'}
                                                                        </label>
                                                                    </Button>
                                                                    <Input
                                                                        id={`doc-file-${index}`}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        className="absolute w-0 h-0 opacity-0"
                                                                        onChange={(e) => e.target.files && handleFileChange(e.target.files[0], index)}
                                                                    />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                           </div>
                                        </div>
                                     </div>
                                  )
                               })}
                               {(profileForm.getValues('documents') || []).length === 0 && (<p className="text-sm text-muted-foreground">No specific documents have been requested.</p>)}
                           </div>
                         </div>
                       </ScrollArea>
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
          </DialogContent>
        </Dialog>
        <Dialog open={isSwitcherOpen} onOpenChange={setIsSwitcherOpen}>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>Switch Company</DialogTitle>
                    <DialogDescription>
                       Select a company to switch to.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        {userCompanies.map(c => (
                            <button
                                key={c.id}
                                className={cn(
                                    "w-full text-left p-3 rounded-md flex items-center justify-between transition-colors",
                                    company?.id === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                                )}
                                onClick={() => handleSwitchCompany(c.id)}
                                disabled={company?.id === c.id}
                            >
                                <span>{c.name}</span>
                                {company?.id === c.id && <Check className="h-5 w-5" />}
                            </button>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
         <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
            <DialogContent>
                <DialogHeader>
                <DialogTitle>Take Photo</DialogTitle>
                <DialogDescription>Take a picture of the document.</DialogDescription>
                </DialogHeader>
                <StandardCamera onSuccess={handlePhotoSuccess} />
            </DialogContent>
        </Dialog>
      </div>
    </header>
    </>
  );
}
