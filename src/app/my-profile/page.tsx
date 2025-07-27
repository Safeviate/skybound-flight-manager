
'use client';

import { useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email(),
  phone: z.string().min(10, {
    message: 'Phone number must be at least 10 characters.',
  }),
  // For password changes
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
    if (data.newPassword && !data.currentPassword) {
        return false;
    }
    return true;
}, {
    message: 'Current password is required to set a new password.',
    path: ['currentPassword'],
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ["confirmPassword"],
});


type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function MyProfilePage() {
  const { user, updateUser, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
        form.reset({
            name: user.name,
            email: user.email,
            phone: user.phone,
        });
    }
  }, [user, loading, router, form]);

  const handleProfileUpdate = async (data: ProfileFormValues) => {
    const success = await updateUser({
        name: data.name,
        phone: data.phone,
    });
    if (success) {
        toast({
            title: 'Profile Updated',
            description: 'Your personal information has been saved.',
        });
    } else {
         toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: 'Could not save your changes. Please try again.',
        });
    }
  };
  
  if (loading || !user) {
      return (
          <main className="flex-1 p-4 md:p-8 flex items-center justify-center">
              <p>Loading profile...</p>
          </main>
      )
  }

  return (
    <main className="flex-1 p-4 md:p-8">
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
           <Form {...form}>
                <form onSubmit={form.handleSubmit(handleProfileUpdate)} className="space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">Personal Information</h3>
                         <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Your Name" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                    <Input placeholder="your@email.com" {...field} disabled />
                                </FormControl>
                                <FormDescription>
                                    Your email address is linked to your authentication and cannot be changed.
                                </FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="555-123-4567" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Separator />

                     <div className="space-y-4">
                        <h3 className="text-lg font-medium">Change Password</h3>
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit">Save Changes</Button>
                    </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </main>
  );
}

MyProfilePage.title = "My Profile";
