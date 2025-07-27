
'use client';
import React, { useState, useEffect } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const profileFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone: z.string().min(10, 'Please enter a valid phone number.'),
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

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        phone: user.phone,
      });
    }
  }, [user, form]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleProfileUpdate = async (data: ProfileFormValues) => {
    const success = await updateUser(data);
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
                Update your contact details here.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Full Name</Label>
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
                      <Label>Phone</Label>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
