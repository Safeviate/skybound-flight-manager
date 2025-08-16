
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
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils.tsx';
import { format } from 'date-fns';
import { trainingExercisesData } from '@/lib/data-provider';
import type { Role, User, Endorsement } from '@/lib/types';
import { useState, useEffect } from 'react';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';


const endorsementFormSchema = z.object({
  name: z.string({
    required_error: 'Please select an endorsement type.',
  }),
  awardedBy: z.string({
    required_error: 'Please select the awarding instructor.',
  }),
  dateAwarded: z.date({
    required_error: 'An award date is required.',
  }),
});

type EndorsementFormValues = z.infer<typeof endorsementFormSchema>;

interface AddEndorsementFormProps {
    studentId: string;
    onSubmit: (data: Omit<Endorsement, 'id'>) => void;
}

export function AddEndorsementForm({ studentId, onSubmit }: AddEndorsementFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [instructors, setInstructors] = useState<User[]>([]);
  
  const form = useForm<EndorsementFormValues>({
    resolver: zodResolver(endorsementFormSchema),
    defaultValues: {
      dateAwarded: new Date(),
    },
  });

  useEffect(() => {
    const fetchInstructors = async () => {
        if (!company) return;
        const instructorRoles: Role[] = ['Instructor Grade 1', 'Instructor Grade 2', 'Instructor Grade 3', 'Chief Flight Instructor', 'Head Of Training'];
        const q = query(collection(db, `companies/${company.id}/users`), where('role', 'in', instructorRoles));
        const snapshot = await getDocs(q);
        setInstructors(snapshot.docs.map(doc => doc.data() as User));
    }
    fetchInstructors();
  }, [company]);


  function handleFormSubmit(data: EndorsementFormValues) {
    const newEndorsement = {
      ...data,
      dateAwarded: format(data.dateAwarded, 'yyyy-MM-dd'),
    };
    onSubmit(newEndorsement);
    toast({
      title: 'Endorsement Added',
      description: `${data.name} has been awarded.`,
    });
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endorsement / Exercise</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an endorsement or exercise" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {trainingExercisesData.map((ex) => (
                    <SelectItem key={ex} value={ex}>
                      {ex}
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
          name="awardedBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Awarded By</FormLabel>
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
            name="dateAwarded"
            render={({ field }) => (
                <FormItem className="flex flex-col">
                    <FormLabel>Date Awarded</FormLabel>
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
                                <span>Pick a date</span>
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
                            disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                        />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="flex justify-end">
          <Button type="submit">Add Endorsement</Button>
        </div>
      </form>
    </Form>
  );
}
