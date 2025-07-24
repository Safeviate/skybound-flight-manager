
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Copy, RefreshCw } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import type { Role, User } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const studentFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  email: z.string().email().optional(),
  phone: z.string().min(10),
  instructor: z.string({
    required_error: 'Please select an instructor.',
  }),
  medicalExpiry: z.date({ required_error: 'An expiry date is required.' }),
  licenseExpiry: z.date({ required_error: 'An expiry date is required.' }),
  consentDisplayContact: z.enum(['Consented', 'Not Consented'], {
    required_error: "You must select a privacy option."
  }),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface NewStudentFormProps {
    onSubmit: (data: Omit<User, 'id'>) => void;
}

export function NewStudentForm({ onSubmit }: NewStudentFormProps) {
  const { company } = useUser();
  const [instructors, setInstructors] = useState<User[]>([]);
  const { toast } = useToast();
  
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      consentDisplayContact: 'Not Consented',
    }
  });
  
  useEffect(() => {
      const fetchInstructors = async () => {
          if (!company) return;
          const instructorRoles: Role[] = ['Instructor', 'Chief Flight Instructor', 'Head Of Training'];
          const q = query(collection(db, `companies/${company.id}/users`), where('role', 'in', instructorRoles));
          const snapshot = await getDocs(q);
          setInstructors(snapshot.docs.map(doc => doc.data() as User));
      }
      fetchInstructors();
  }, [company]);
  
  function handleFormSubmit(data: StudentFormValues) {
    onSubmit({
        ...data,
        medicalExpiry: format(data.medicalExpiry, 'yyyy-MM-dd'),
        licenseExpiry: format(data.licenseExpiry, 'yyyy-MM-dd'),
    } as unknown as Omit<User, 'id'>);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="John Doe" {...field} />
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
              <FormLabel>Email (Optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="student@email.com" {...field} />
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
                <Input type="tel" placeholder="555-123-4567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="instructor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructor</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an instructor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {instructors.map((instructor) => (
                    <SelectItem key={instructor.id} value={instructor.name}>
                      {instructor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
            control={form.control}
            name="medicalExpiry"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Medical Certificate Expiry</FormLabel>
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
        <FormField
            control={form.control}
            name="licenseExpiry"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>License/Endorsement Expiry</FormLabel>
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

        <FormField
          control={form.control}
          name="consentDisplayContact"
          render={({ field }) => (
            <FormItem className="space-y-3 rounded-md border p-4">
              <FormLabel>Privacy Consent</FormLabel>
              <FormDescription>
                Select whether this user's contact details (email and phone number) can be displayed to other users within the application for operational purposes.
              </FormDescription>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Consented" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      I consent
                    </FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value="Not Consented" />
                    </FormControl>
                    <FormLabel className="font-normal">
                      I do not consent
                    </FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <div className="flex justify-end">
          <Button type="submit">Add Student</Button>
        </div>
      </form>
    </Form>
  );
}
