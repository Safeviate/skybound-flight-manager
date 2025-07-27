
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUser } from '@/context/user-provider';

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email({
    message: 'Please enter a valid email address.',
  }),
  phone: z.string().min(10, {
    message: 'Phone number must be at least 10 characters.',
  }),
  documentType: z.string({ required_error: 'Please select a document type.' }),
  documentExpiry: z.date({ required_error: 'An expiry date is required.' }),
  documentFile: z.any().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface EditProfileFormProps {
    user: User;
    onUpdate?: () => void;
}

export function EditProfileForm({ user, onUpdate }: EditProfileFormProps) {
  const { toast } = useToast();
  const { updateUser } = useUser();
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      phone: user.phone,
      documentExpiry: user.medicalExpiry ? parseISO(user.medicalExpiry) : new Date(), // Defaulting to one, can be improved
    },
  });

  async function onSubmit(data: ProfileFormValues) {
    const updatedUserData: Partial<User> = {
        name: data.name,
        email: data.email,
        phone: data.phone,
    };

    if (data.documentType === 'Medical') {
        updatedUserData.medicalExpiry = format(data.documentExpiry, 'yyyy-MM-dd');
    } else if (data.documentType === 'License') {
        updatedUserData.licenseExpiry = format(data.documentExpiry, 'yyyy-MM-dd');
    }
    
    const success = await updateUser(updatedUserData);
    if (success) {
        toast({
          title: 'Profile Updated',
          description: 'Your information has been saved.',
        });
        onUpdate?.();
    } else {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: 'Could not save your profile information. Please try again.',
        });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Name</FormLabel>
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input placeholder="your.email@example.com" {...field} />
                </FormControl>
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
        </div>
        
        <div className="space-y-2">
            <FormLabel>Add Document</FormLabel>
            <div className="flex flex-col md:flex-row gap-4">
                <FormField
                    control={form.control}
                    name="documentType"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Medical">Medical Certificate</SelectItem>
                                <SelectItem value="License">Pilot License</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="documentExpiry"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick expiry date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <div className="flex-1 space-y-2 pt-4">
                    <FormLabel>Upload Document</FormLabel>
                    <Input type="file" {...form.register('documentFile')} />
                </div>
        </div>

        <div className="flex justify-end">
            <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
