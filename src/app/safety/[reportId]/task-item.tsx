
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MessageSquare, CheckCircle, XCircle, CalendarIcon } from 'lucide-react';
import type { InvestigationTask, TaskComment, User } from '@/lib/types';
import { useUser } from '@/context/user-provider';
import { cn } from '@/lib/utils';

const commentFormSchema = z.object({
    message: z.string().min(1, "Comment cannot be empty."),
});
type CommentFormValues = z.infer<typeof commentFormSchema>;

const extensionFormSchema = z.object({
    requestedDeadline: z.date({ required_error: 'A new deadline is required.'}),
    extensionRequestReason: z.string().min(10, 'A reason for the request is required.'),
});
type ExtensionFormValues = z.infer<typeof extensionFormSchema>;

const TaskCommentForm = ({ taskId, onAddComment }: { taskId: string, onAddComment: (taskId: string, message: string) => void }) => {
    const form = useForm<CommentFormValues>({ resolver: zodResolver(commentFormSchema) });
    const { user } = useUser();

    const onSubmit = (data: CommentFormValues) => {
        if (!user) return;
        onAddComment(taskId, data.message);
        form.reset({ message: '' });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2 pt-2">
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem className="flex-1">
                            <FormControl>
                                <Textarea placeholder="Add a comment..." {...field} rows={1} className="min-h-0" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" size="sm">Comment</Button>
            </form>
        </Form>
    );
};

export const TaskItem = ({ task, personnel, onUpdateTask, onAddComment, onMarkCommentsRead, onRequestExtension, onApproveExtension, onRejectExtension }: { task: InvestigationTask; personnel: User[]; onUpdateTask: (taskId: string, status: 'Open' | 'Completed') => void; onAddComment: (taskId: string, message: string) => void; onMarkCommentsRead: (taskId: string) => void; onRequestExtension: (taskId: string, reason: string, newDeadline: string) => void; onApproveExtension: (taskId: string) => void; onRejectExtension: (taskId: string) => void; }) => {
    const { user } = useUser();
    const unreadCount = task.comments?.filter(c => !c.readBy?.includes(user?.id || '')).length || 0;
    const isUserAssigned = user?.name === task.assignedTo;
    const isTeamLead = user?.permissions.includes('Safety:Edit') || user?.permissions.includes('Super User');

    const [isExtensionOpen, setIsExtensionOpen] = useState(false);
    const extensionForm = useForm<ExtensionFormValues>({ resolver: zodResolver(extensionFormSchema) });

    const handleExtensionSubmit = (data: ExtensionFormValues) => {
        onRequestExtension(task.id, data.extensionRequestReason, format(data.requestedDeadline, 'yyyy-MM-dd'));
        setIsExtensionOpen(false);
        extensionForm.reset();
    };

    return (
         <Collapsible key={task.id} className="border p-4 rounded-lg" onOpenChange={(isOpen) => isOpen && unreadCount > 0 && onMarkCommentsRead(task.id)}>
            <div className="flex items-start gap-4">
                <Checkbox 
                    id={`task-${task.id}`}
                    checked={task.status === 'Completed'}
                    onCheckedChange={() => onUpdateTask(task.id, task.status === 'Open' ? 'Completed' : 'Open')}
                    className="mt-1 no-print"
                />
                <div className="flex-1 grid gap-1">
                    <Label htmlFor={`task-${task.id}`} className={cn("font-medium", task.status === 'Completed' && 'line-through text-muted-foreground')}>{task.description}</Label>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Assigned to: {task.assignedTo}</span>
                        <Badge variant={new Date(task.dueDate) < new Date() && task.status === 'Open' ? 'destructive' : 'outline'}>
                            Due: {format(new Date(task.dueDate), 'PPP')}
                        </Badge>
                    </div>
                </div>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="relative no-print">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Comments ({task.comments?.length || 0})
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-primary text-primary-foreground text-[10px] items-center justify-center">{unreadCount}</span>
                            </span>
                        )}
                    </Button>
                </CollapsibleTrigger>
            </div>
             {task.extensionStatus === 'Pending' && (
                 <div className="mt-3 p-3 bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 rounded-md text-sm space-y-2">
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">Extension Requested</h4>
                    <p>New Deadline: {format(parseISO(task.requestedDeadline!), 'PPP')}</p>
                    <p className="p-2 bg-background rounded-md text-muted-foreground italic">"{task.extensionRequestReason}"</p>
                    {isTeamLead && (
                        <div className="flex gap-2 pt-2 border-t border-amber-300 dark:border-amber-700 no-print">
                            <Button size="sm" variant="success" onClick={() => onApproveExtension(task.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => onRejectExtension(task.id)}>
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                            </Button>
                        </div>
                    )}
                </div>
            )}
            <CollapsibleContent className="pt-4 mt-4 border-t">
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {task.comments?.map(comment => {
                         const isUnread = !comment.readBy?.includes(user?.id || '');
                         return (
                        <div key={comment.id} className={cn("flex gap-3", isUnread && 'p-2 rounded-md bg-primary/10')}>
                            <div className="flex-1 space-y-1 text-sm">
                                <div className="flex items-baseline justify-between">
                                    <p className="font-semibold">{comment.author}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(comment.date), "MMM d, yyyy 'at' h:mm a")}</p>
                                </div>
                                <div className="p-2 rounded-md bg-background whitespace-pre-wrap">{comment.message}</div>
                            </div>
                        </div>
                    )})}
                    {(!task.comments || task.comments.length === 0) && (
                         <p className="text-xs text-muted-foreground text-center py-2">No comments yet.</p>
                    )}
                </div>
                <div className="no-print">
                    <TaskCommentForm taskId={task.id} onAddComment={onAddComment} />
                </div>
                {isUserAssigned && (
                    <div className="pt-3 mt-3 border-t no-print">
                         <Dialog open={isExtensionOpen} onOpenChange={setIsExtensionOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">Request Deadline Extension</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Request Deadline Extension</DialogTitle>
                                </DialogHeader>
                                <Form {...extensionForm}>
                                    <form onSubmit={extensionForm.handleSubmit(handleExtensionSubmit)} className="space-y-4">
                                        <FormField control={extensionForm.control} name="requestedDeadline" render={({ field }) => (<FormItem><FormLabel>New Deadline</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")} data-nosnippet><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP") : <span>Pick date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                        <FormField control={extensionForm.control} name="extensionRequestReason" render={({ field }) => (<FormItem><FormLabel>Reason for Request</FormLabel><FormControl><Textarea placeholder="Explain why an extension is needed..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="flex justify-end"><Button type="submit">Submit Request</Button></div>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
};
