
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { userData } from '@/lib/mock-data';
import type { DiscussionEntry, SafetyReport } from '@/lib/types';
import { cn } from '@/lib/utils.tsx';
import { CalendarIcon, MessageSquare, Send, Reply as ReplyIcon, User as UserIcon } from 'lucide-react';
import { useUser } from '@/context/user-provider';

const discussionFormSchema = z.object({
  recipient: z.string().min(1, 'You must select a recipient.'),
  message: z.string().min(3, 'Message must be at least 3 characters long.'),
  replyByDate: z.date().optional(),
});

type DiscussionFormValues = z.infer<typeof discussionFormSchema>;

interface DiscussionSectionProps {
  report: SafetyReport;
  onUpdate: (updatedReport: SafetyReport) => void;
}

export function DiscussionSection({ report, onUpdate }: DiscussionSectionProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const discussionEntries = report.discussion || [];
  const investigationTeam = report.investigationTeam || [];

  const form = useForm<DiscussionFormValues>({
    resolver: zodResolver(discussionFormSchema),
  });

  const availableRecipients = userData.filter(
    (u) => investigationTeam.includes(u.name) && u.name !== user?.name
  );

  function onSubmit(data: DiscussionFormValues) {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be logged in to post.'});
        return;
    }

    const newEntry: DiscussionEntry = {
        id: `d-${Date.now()}`,
        author: user.name,
        datePosted: new Date().toISOString(),
        ...data,
        replyByDate: data.replyByDate ? data.replyByDate.toISOString() : undefined,
    };
    
    const updatedReport = {
        ...report,
        discussion: [...discussionEntries, newEntry],
    };

    onUpdate(updatedReport);
    form.reset();
    toast({
      title: 'Message Sent',
      description: `Your message has been sent to ${data.recipient}.`,
    });
  }

  const handleReplyClick = (entry: DiscussionEntry) => {
    form.setValue('recipient', entry.author);
    form.setValue('message', `> Replying to: "${entry.message}"\n\n`);
    const messageTextarea = document.getElementById('message');
    if (messageTextarea) {
        messageTextarea.focus();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium flex items-center gap-2"><MessageSquare /> Investigation Discussion</h3>
        <div className="mt-4 space-y-4">
            {discussionEntries.length > 0 ? (
                discussionEntries.map((entry) => {
                    const author = userData.find(u => u.name === entry.author);
                    return (
                        <div key={entry.id} className="flex gap-3">
                            <div className="h-9 w-9 flex-shrink-0 bg-muted rounded-full flex items-center justify-center">
                                <UserIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-sm">{entry.author} <ReplyIcon className="inline h-3 w-3 text-muted-foreground mx-1" /> {entry.recipient}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(entry.datePosted), "MMM d, yyyy 'at' h:mm a")}</p>
                                </div>
                                <div className="p-3 rounded-md bg-muted text-sm">{entry.message}</div>
                                <div className="flex items-center justify-between">
                                    {entry.replyByDate && (
                                        <div className="text-xs text-muted-foreground">
                                            <Badge variant="warning">Reply needed by {format(new Date(entry.replyByDate), 'MMM d, yyyy')}</Badge>
                                        </div>
                                    )}
                                    {user?.name === entry.recipient && (
                                        <Button variant="link" size="sm" onClick={() => handleReplyClick(entry)} className="p-0 h-auto text-xs">
                                            <ReplyIcon className="mr-1 h-3 w-3" />
                                            Reply
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No discussion entries yet.</p>
            )}
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border-t pt-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <FormField
                control={form.control}
                name="recipient"
                render={({ field }) => (
                <FormItem className="flex-1">
                    <FormLabel>Send To</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select a team member" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {availableRecipients.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                            {p.name}
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
                name="replyByDate"
                render={({ field }) => (
                    <FormItem className="flex-1">
                        <FormLabel>Reply Needed By (Optional)</FormLabel>
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
                                disabled={(date) => date < new Date()}
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
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message / Instruction</FormLabel>
                <FormControl>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit">
                <Send className="mr-2 h-4 w-4" />
                Post Message
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
