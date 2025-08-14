
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format, parseISO } from 'date-fns';
import type { Role, User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const studentFormSchema = z.object({
  name: z.string().min(2, {
    message: 'Name must be at least 2 characters.',
  }),
  studentCode: z.string().optional(),
  email: z.string().email(),
  phone: z.string().regex(phoneRegex, 'Invalid Number!'),
  instructor: z.string({
    required_error: 'Please select an instructor.',
  }),
  licenseType: z.string().optional(),
  medicalExpiry: z.date().optional().nullable(),
  licenseExpiry: z.date().optional().nullable(),
  passportExpiry: z.date().optional().nullable(),
  visaExpiry: z.date().optional().nullable(),
  consentDisplayContact: z.enum(['Consented', 'Not Consented'], {
    required_error: "You must select a privacy option."
  }),
});

type StudentFormValues = z.infer<typeof studentFormSchema>;

interface EditStudentFormProps {
    student: User;
    onUpdate: (data: User) => void;
}

export function EditStudentForm({ student, onUpdate }: EditStudentFormProps) {
  const { company } = useUser();
  const [instructors, setInstructors] = useState<User[]>([]);
  
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
  });

  useEffect(() => {
    if (student) {
        form.reset({
            name: student.name,
            studentCode: student.studentCode || '',
            email: student.email || '',
            phone: student.phone,
            instructor: student.instructor,
            licenseType: student.licenseType || '',
            medicalExpiry: student.medicalExpiry ? parseISO(student.medicalExpiry) : null,
            licenseExpiry: student.licenseExpiry ? parseISO(student.licenseExpiry) : null,
            passportExpiry: student.passportExpiry ? parseISO(student.passportExpiry) : null,
            visaExpiry: student.visaExpiry ? parseISO(student.visaExpiry) : null,
            consentDisplayContact: student.consentDisplayContact || 'Not Consented',
        });
    }
  }, [student, form]);
  
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
    const updatedStudent: User = {
        ...student,
        ...data,
        medicalExpiry: data.medicalExpiry ? format(data.medicalExpiry, 'yyyy-MM-dd') : null,
        licenseExpiry: data.licenseExpiry ? format(data.licenseExpiry, 'yyyy-MM-dd') : null,
        passportExpiry: data.passportExpiry ? format(data.passportExpiry, 'yyyy-MM-dd') : null,
        visaExpiry: data.visaExpiry ? format(data.visaExpiry, 'yyyy-MM-dd') : null,
    };
    onUpdate(updatedStudent);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
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
              name="studentCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., S12345" {...field} value={field.value ?? ''} />
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
                    <Input type="tel" placeholder="+27 12 345 6789" {...field} />
                </FormControl>
                 <FormDescription>
                  Include country code.
                </FormDescription>
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
                name="licenseType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>License Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value || ''}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a license type" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="SPL">SPL</SelectItem>
                            <SelectItem value="PPL">PPL</SelectItem>
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
                name="passportExpiry"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Passport Expiry</FormLabel>
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
                name="visaExpiry"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Visa Expiry</FormLabel>
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
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
