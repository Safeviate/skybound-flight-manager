
'use client';

import { useUser } from '@/context/user-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  phone: z.string().min(10, { message: 'Please enter a valid phone number.' }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function MyProfilePage() {
    const { user, loading, updateUser } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
        }
    });

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        } else if (user) {
            form.reset({
                name: user.name,
                email: user.email || '',
                phone: user.phone || '',
            });
        }
    }, [user, loading, router, form]);

    async function onSubmit(data: ProfileFormValues) {
        const success = await updateUser(data);
        if (success) {
            toast({
                title: "Profile Updated",
                description: "Your personal information has been successfully updated.",
            });
        } else {
            toast({
                variant: 'destructive',
                title: "Update Failed",
                description: "There was an error updating your profile. Please try again.",
            });
        }
    }

    if (loading || !user) {
        return (
            <main className="flex-1 flex items-center justify-center">
                <p>Loading...</p>
            </main>
        );
    }

  return (
      <main className="flex-1 p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>My Personal Information</CardTitle>
                <CardDescription>Update your contact details here. Your email is used for login and cannot be changed here.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="Your full name" {...field} />
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
                                <FormLabel>Email Address</FormLabel>
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
                                    <Input placeholder="Your phone number" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit">
                                <Save className="mr-2 h-4 w-4" />
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
      </main>
  );
}

MyProfilePage.title = 'My Profile';
export default MyProfilePage;
