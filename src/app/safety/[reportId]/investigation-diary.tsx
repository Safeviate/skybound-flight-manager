

'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { InvestigationDiaryEntry, SafetyReport } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { BookOpen, User as UserIcon, PlusCircle } from 'lucide-react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const diaryFormSchema = z.object({
  entryText: z.string().min(1, 'Diary entry cannot be empty.'),
});

type DiaryFormValues = z.infer<typeof diaryFormSchema>;

interface InvestigationDiaryProps {
  report: SafetyReport;
  onUpdate: (updatedReport: SafetyReport) => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
}

export function InvestigationDiary({ report, onUpdate, isDialogOpen, setIsDialogOpen }: InvestigationDiaryProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const diaryEntries = report.investigationDiary || [];

  const form = useForm<DiaryFormValues>({
    resolver: zodResolver(diaryFormSchema),
  });

  function onSubmit(data: DiaryFormValues) {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in to post.'});
        return;
    }

    const newEntry: InvestigationDiaryEntry = {
        id: `diary-${Date.now()}`,
        author: user.name,
        date: new Date().toISOString(),
        entryText: data.entryText,
    };
    
    const updatedReport = {
        ...report,
        investigationDiary: [...diaryEntries, newEntry],
    };

    onUpdate(updatedReport);
    form.reset();
    setIsDialogOpen(false); // Close dialog on submit
    toast({
      title: 'Diary Entry Added',
      description: 'Your entry has been added to the investigation diary.',
    });
  }

  if (isDialogOpen) {
      return (
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Add New Diary Entry</DialogTitle>
            <DialogDescription>
                Record an action, decision, or note. This will be added to the chronological investigation log.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                control={form.control}
                name="entryText"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>New Diary Entry</FormLabel>
                    <FormControl>
                        <Textarea
                        id="diaryEntry"
                        placeholder="Log an action, decision, or note..."
                        className="min-h-[100px]"
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="flex justify-end items-center">
                <Button type="submit">
                    Add to Diary
                </Button>
                </div>
            </form>
            </Form>
        </DialogContent>
      )
  }

  return (
      <div className="mt-4 space-y-4 max-h-96 overflow-y-auto pr-4 border rounded-lg p-4">
        {diaryEntries.length > 0 ? (
          diaryEntries.slice().reverse().map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <div className="h-9 w-9 flex-shrink-0 bg-muted rounded-full flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{entry.author}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(entry.date), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{entry.entryText}</div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No diary entries yet.</p>
        )}
      </div>
  );
}

