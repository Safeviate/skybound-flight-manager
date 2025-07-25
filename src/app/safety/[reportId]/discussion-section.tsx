
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
import type { DiscussionEntry, SafetyReport, User } from '@/lib/types';
import { cn } from '@/lib/utils.tsx';
import { CalendarIcon, MessageSquare, Send, Reply as ReplyIcon, User as UserIcon } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

const discussionFormSchema = z.object({
  recipient: z.string().min(1, 'You must select a recipient.'),
  message: z.string().min(1, 'Message cannot be empty.'),
  replyByDate: z.date().optional(),
});

type DiscussionFormValues = z.infer<typeof discussionFormSchema>;

interface DiscussionSectionProps {
  report: SafetyReport;
  onUpdate: (updatedReport: SafetyReport) => void;
  form: any;
  handleFormSubmit: (data: DiscussionFormValues) => void;
  availableRecipients: User[];
  setIsDialogOpen: (isOpen: boolean) => void;
}

export function DiscussionSection({ report, onUpdate, form, handleFormSubmit, availableRecipients }: DiscussionSectionProps) {
  const { user } = useUser();
  const discussionEntries = report.discussion || [];

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
        <div className="mt-4 space-y-4 max-h-96 overflow-y-auto pr-4">
            {discussionEntries.length > 0 ? (
                discussionEntries.map((entry) => (
                    <div key={entry.id} className="flex gap-3">
                        <div className="h-9 w-9 flex-shrink-0 bg-muted rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold text-sm">{entry.author} <ReplyIcon className="inline h-3 w-3 text-muted-foreground mx-1" /> {entry.recipient}</p>
                                <p className="text-xs text-muted-foreground">{format(new Date(entry.datePosted), "MMM d, yyyy 'at' h:mm a")}</p>
                            </div>
                            <div className="p-3 rounded-md bg-muted text-sm whitespace-pre-wrap">{entry.message}</div>
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
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No discussion entries yet.</p>
            )}
        </div>
    </div>
  );
}
