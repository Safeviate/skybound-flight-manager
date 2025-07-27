
'use client';
import React, { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, FileText } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { UserDocument } from '@/lib/types';


const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().min(10, 'Please enter a valid phone number.'),
  documents: z.array(z.object({
    id: z.string(),
    type: z.string(),
    expiryDate: z.date().nullable().optional(),
  })).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function Header({ title, children }: { title: string, children?: React.ReactNode }) {
  const { user, logout, updateUser } = useUser();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });
  
  const getCombinedDocuments = React.useCallback(() => {
    if (!user) return [];
    
    const requiredDocs = user.requiredDocuments || [];
    const userDocs = user.documents || [];
    
    // Create a map of existing user documents by type for easy lookup
    const userDocsMap = new Map(userDocs.map(d => [d.type, d]));

    const combined = requiredDocs.map(reqDocType => {
      // If a document of this type already exists, use it. Otherwise, create a placeholder.
      const existingDoc = userDocsMap.get(reqDocType);
      return existingDoc || { id: `new-${reqDocType}-${Date.now()}`, type: reqDocType, expiryDate: null };
    });
    
    return combined;
  }, [user]);

  useEffect(() => {
    if (user && isProfileOpen) {
      const combinedDocs = getCombinedDocuments();
      form.reset({
        name: user.name,
        phone: user.phone,
        documents: combinedDocs.map(d => ({ ...d, expiryDate: d.expiryDate ? parseISO(d.expiryDate) : null })),
      });
    }
  }, [user, form, isProfileOpen, getCombinedDocuments]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleProfileUpdate = async (data: ProfileFormValues) => {
    const userDocs = user?.documents || [];
    const userDocsMap = new Map(userDocs.map(d => [d.type, d]));

    const updatedDocs = data.documents?.map(d => {
        // Find if an original document with the same type exists
        const originalDoc = userDocsMap.get(d.type);
        return {
            ...d,
            // Preserve the original ID if it exists, otherwise it's a new placeholder ID
            id: originalDoc ? originalDoc.id : d.id,
            expiryDate: d.expiryDate ? format(d.expiryDate, 'yyyy-MM-dd') : null
        };
    }) || [];

    const success = await updateUser({
      name: data.name,
      phone: data.phone,
      documents: updatedDocs as UserDocument[],
    });

    if (success) {
      toast({ title: 'Profile Updated', description: 'Your information has been successfully saved.' });
      setIsProfileOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your changes.' });
    }
  };
  
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-8 no-print">
      <div className="md:hidden">
        <SidebarTrigger />
      </div>
      
      <div className="flex items-center gap-2">
        {/* Intentionally left for stable element positioning, other content added dynamically */}
      </div>

      <h1 className="text-xl font-semibold md:text-2xl whitespace-nowrap flex-1">{title}</h1>
      
      <div className="flex items-center justify-end gap-4">
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
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setIsProfileOpen(true)}>
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>My Personal Information</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>My Personal Information</DialogTitle>
              <DialogDescription>
                Update your contact details and view required documents.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <Label>Email</Label>
                  <Input value={user?.email || ''} disabled />
                </FormItem>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />

                <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        Required Documents
                    </h4>
                    <div className="space-y-4">
                      {form.watch('documents')?.map((docItem, index) => {
                            return (
                           <FormField
                              key={docItem.id}
                              control={form.control}
                              name={`documents.${index}.expiryDate`}
                              render={({ field }) => {
                                // This is a trick to re-assign the correct type to the field object
                                const typedField = field as unknown as { value: Date | null | undefined; onChange: (date: Date | undefined) => void };

                                return (
                                <FormItem className="flex items-center justify-between">
                                  <FormLabel className="w-1/2">{docItem.type}</FormLabel>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <FormControl>
                                        <Button
                                          variant={"outline"}
                                          className={cn(
                                            "w-1/2 pl-3 text-left font-normal",
                                            !typedField.value && "text-muted-foreground"
                                          )}
                                        >
                                          {typedField.value ? format(typedField.value, "PPP") : <span>Set expiry</span>}
                                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                      </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={typedField.value || undefined}
                                        onSelect={typedField.onChange}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </FormItem>
                              )}}
                           />
                        )})}
                      {(form.getValues('documents') || []).length === 0 && (
                          <p className="text-sm text-muted-foreground">No specific documents have been requested.</p>
                      )}
                    </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Close
                    </Button>
                  </DialogClose>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
