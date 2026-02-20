'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Clipboard, CheckCircle, CalendarIcon, ChevronDown, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport, InvestigationTask, User as Personnel } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

const manualTaskFormSchema = z.object({
  description: z.string().min(5, 'Task description must be at least 5 characters.'),
  assignedTo: z.string({ required_error: 'You must assign this task.' }),
  dueDate: z.date({ required_error: 'A due date is required.' }),
});

type ManualTaskFormValues = z.infer<typeof manualTaskFormSchema>;

export function InvestigationStepsGenerator({ report, personnel, onAssignTasks }: { report: SafetyReport, personnel: Personnel[], onAssignTasks: (tasks: Omit<InvestigationTask, 'id'|'status'>[]) => void; }) {
  const { toast } = useToast();
  const [isManualTaskOpen, setIsManualTaskOpen] = useState(false);

  const manualTaskForm = useForm<ManualTaskFormValues>({
      resolver: zodResolver(manualTaskFormSchema),
      defaultValues: {
          dueDate: addDays(new Date(), 7),
      }
  });

  const handleManualTaskSubmit = (data: ManualTaskFormValues) => {
      onAssignTasks([{
          description: data.description,
          assignedTo: data.assignedTo,
          dueDate: format(data.dueDate, 'yyyy-MM-dd'),
      }]);
      manualTaskForm.reset();
      setIsManualTaskOpen(false);
      toast({ title: "Task Added", description: "The investigation task has been assigned." });
  };

  return (
    <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h4 className="text-sm font-semibold">Investigation Planning</h4>
            <p className="text-xs text-muted-foreground">
                Manually define the structured investigation plan and assign tasks to the team.
            </p>
         </div>
         <Dialog open={isManualTaskOpen} onOpenChange={setIsManualTaskOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Investigation Task
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Investigation Task</DialogTitle>
                    <DialogDescription>Create a new task for the investigation team.</DialogDescription>
                </DialogHeader>
                <Form {...manualTaskForm}>
                    <form onSubmit={manualTaskForm.handleSubmit(handleManualTaskSubmit)} className="space-y-4">
                        <FormField
                            control={manualTaskForm.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Task Description</FormLabel>
                                    <FormControl><Textarea placeholder="e.g., Interview the pilot in command..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={manualTaskForm.control}
                                name="assignedTo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assign To</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {personnel.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={manualTaskForm.control}
                                name="dueDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Due Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                                    >
                                                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit">Assign Task</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  );
}
