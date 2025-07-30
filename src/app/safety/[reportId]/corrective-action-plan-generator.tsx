
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bot, Check, ShieldCheck, PlusCircle, Send, MessageSquare, Trash2, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport, User, Alert, CorrectiveAction, TaskComment } from '@/lib/types';
import type { GenerateCorrectiveActionPlanOutput } from '@/ai/flows/generate-corrective-action-plan-flow';
import { generatePlanAction } from './actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { useUser } from '@/context/user-provider';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const initialState = {
  message: '',
  data: null,
  errors: null,
};

const commentFormSchema = z.object({
  message: z.string().min(1, "Comment cannot be empty."),
});
type CommentFormValues = z.infer<typeof commentFormSchema>;

const actionFormSchema = z.object({
  action: z.string().min(10, 'Action description must be at least 10 characters.'),
  responsiblePerson: z.string().min(1, 'You must select a responsible person.'),
  deadline: z.date(),
});
type ActionFormValues = z.infer<typeof actionFormSchema>;


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Generate Corrective Action Plan
    </Button>
  );
}

function AnalysisResult({ data, onAccept }: { data: GenerateCorrectiveActionPlanOutput, onAccept: (plan: GenerateCorrectiveActionPlanOutput) => void }) {
  // This component remains largely unchanged as it's for the initial AI suggestion
  // ... (implementation from previous turn)
}

const ActionItem = ({ action, personnel, onUpdate, onDelete, onAddComment }: { action: CorrectiveAction, personnel: User[], onUpdate: (action: CorrectiveAction) => void, onDelete: (actionId: string) => void, onAddComment: (actionId: string, comment: string) => void }) => {
    const { user } = useUser();
    const [isEditing, setIsEditing] = useState(false);

    const handleStatusChange = (newStatus: 'Not Started' | 'In Progress' | 'Completed') => {
        onUpdate({ ...action, status: newStatus });
    };

    const handleDeadlineChange = (newDate?: Date) => {
        if (newDate) {
            onUpdate({ ...action, deadline: format(newDate, 'yyyy-MM-dd') });
        }
    };
    
    const handleAssigneeChange = (newName: string) => {
        onUpdate({ ...action, responsiblePerson: newName });
    }

    const commentForm = useForm<CommentFormValues>({ resolver: zodResolver(commentFormSchema) });

    const handleCommentSubmit = (data: CommentFormValues) => {
        onAddComment(action.id, data.message);
        commentForm.reset();
    }

    return (
         <Collapsible key={action.id} className="p-4 border rounded-lg space-y-3">
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-4">
                    <p className="font-semibold">{action.action}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Responsible: {action.responsiblePerson}</span>
                        <span>Due: {format(parseISO(action.deadline), 'MMM d, yyyy')}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={action.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Not Started">Not Started</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                    <CollapsibleTrigger asChild>
                         <Button variant="ghost" size="sm" className="relative">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            ({action.comments?.length || 0})
                        </Button>
                    </CollapsibleTrigger>
                </div>
            </div>
            <CollapsibleContent className="space-y-4 pt-3 border-t">
                {/* Comment display section */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {action.comments?.map(comment => (
                        <div key={comment.id} className="flex items-start gap-2">
                            <p className="text-sm"><span className="font-semibold">{comment.author}:</span> {comment.message}</p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">{format(parseISO(comment.date), 'dd MMM')}</p>
                        </div>
                    ))}
                </div>
                {/* Comment form */}
                <Form {...commentForm}>
                    <form onSubmit={commentForm.handleSubmit(handleCommentSubmit)} className="flex items-center gap-2">
                       <FormField
                            control={commentForm.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                        <Input placeholder="Add a comment or request extension..." {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="sm">Send</Button>
                    </form>
                </Form>
                 {/* Edit section */}
                <div className="pt-3 border-t">
                    <p className="text-xs font-semibold text-muted-foreground">Edit Action</p>
                    <div className="flex items-end gap-2 mt-1">
                         <div className="flex-1">
                            <Label className="text-xs">Responsible Person</Label>
                            <Select value={action.responsiblePerson} onValueChange={handleAssigneeChange}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {personnel.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1">
                            <Label className="text-xs">Due Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !action.deadline && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {action.deadline ? format(parseISO(action.deadline), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={parseISO(action.deadline)} onSelect={handleDeadlineChange} initialFocus /></PopoverContent>
                            </Popover>
                        </div>
                        <Button variant="destructive" size="icon" onClick={() => onDelete(action.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </CollapsibleContent>
         </Collapsible>
    );
};


export function CorrectiveActionPlanGenerator({ 
    report, 
    personnel,
    onUpdate 
}: { 
    report: SafetyReport, 
    personnel: User[],
    onUpdate: (updatedReport: Partial<SafetyReport>) => void; 
}) {
  const [state, formAction] = useActionState(generatePlanAction, initialState);
  const { toast } = useToast();
  const { user, company } = useUser();
  const [isAddingAction, setIsAddingAction] = useState(false);
  const addActionForm = useForm<ActionFormValues>({ resolver: zodResolver(actionFormSchema) });

  useEffect(() => {
    if (state.message && !state.message.includes('generated')) {
      toast({ variant: 'destructive', title: 'Error', description: state.message });
    }
  }, [state, toast]);

  const handleAcceptPlan = async (plan: GenerateCorrectiveActionPlanOutput) => {
    // ... (implementation from previous turn)
  };

  const handleUpdateAction = (updatedAction: CorrectiveAction) => {
    const updatedActions = report.correctiveActionPlan?.correctiveActions.map(a => a.id === updatedAction.id ? updatedAction : a);
    onUpdate({ correctiveActionPlan: { ...report.correctiveActionPlan!, correctiveActions: updatedActions! } });
  };
  
  const handleDeleteAction = (actionId: string) => {
    const updatedActions = report.correctiveActionPlan?.correctiveActions.filter(a => a.id !== actionId);
    onUpdate({ correctiveActionPlan: { ...report.correctiveActionPlan!, correctiveActions: updatedActions! } });
  };

  const handleAddComment = (actionId: string, message: string) => {
    if (!user) return;
    const newComment: TaskComment = { id: `capc-${Date.now()}`, author: user.name, date: new Date().toISOString(), message, readBy: [user.id] };
    const updatedActions = report.correctiveActionPlan?.correctiveActions.map(action => {
        if (action.id === actionId) {
            return { ...action, comments: [...(action.comments || []), newComment] };
        }
        return action;
    });
    onUpdate({ correctiveActionPlan: { ...report.correctiveActionPlan!, correctiveActions: updatedActions! } });
  };
  
  const handleAddActionSubmit = (data: ActionFormValues) => {
      const newAction: CorrectiveAction = {
          ...data,
          id: `capa-${Date.now()}`,
          status: 'Not Started',
          deadline: format(data.deadline, 'yyyy-MM-dd')
      };
      const updatedActions = [...(report.correctiveActionPlan?.correctiveActions || []), newAction];
      onUpdate({ correctiveActionPlan: { ...report.correctiveActionPlan!, correctiveActions: updatedActions } });
      addActionForm.reset();
      setIsAddingAction(false);
  }

  if (!report.correctiveActionPlan) {
      return (
         <Card>
            <CardHeader>
                <CardTitle>Corrective Action Plan Generator</CardTitle>
                <CardDescription>Use the AI assistant to generate a corrective action plan based on the full investigation.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={formAction}>
                    <input type="hidden" name="report" value={JSON.stringify(report)} />
                    <SubmitButton />
                </form>
                {state.data && <AnalysisResult data={state.data as GenerateCorrectiveActionPlanOutput} onAccept={handleAcceptPlan} />}
            </CardContent>
        </Card>
      )
  }

  return (
    <Card>
        <CardHeader>
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck className="text-primary"/> Corrective Action Plan</CardTitle>
                    <CardDescription>This is the official plan to address the findings of the investigation.</CardDescription>
                </div>
                 <Dialog open={isAddingAction} onOpenChange={setIsAddingAction}>
                    <DialogTrigger asChild>
                         <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4"/> Add Action</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Corrective Action</DialogTitle>
                        </DialogHeader>
                        <Form {...addActionForm}>
                            <form onSubmit={addActionForm.handleSubmit(handleAddActionSubmit)} className="space-y-4">
                                <FormField name="action" control={addActionForm.control} render={({field}) => (<FormItem><FormLabel>Action</FormLabel><FormControl><Textarea placeholder="Describe the corrective action..." {...field}/></FormControl><FormMessage/></FormItem>)} />
                                <FormField name="responsiblePerson" control={addActionForm.control} render={({field}) => (<FormItem><FormLabel>Responsible Person</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select person..." /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage/></FormItem>)} />
                                <FormField name="deadline" control={addActionForm.control} render={({field}) => (<FormItem><FormLabel>Deadline</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4"/>{field.value ? format(field.value, "PPP") : <span>Pick date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage/></FormItem>)} />
                                <div className="flex justify-end"><Button type="submit">Save Action</Button></div>
                            </form>
                        </Form>
                    </DialogContent>
                 </Dialog>
            </div>
        </CardHeader>
        <CardContent className="space-y-6">
             <div>
                <h4 className="font-semibold text-sm">Summary of Findings</h4>
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{report.correctiveActionPlan.summaryOfFindings}</p>
            </div>
            <div>
                <h4 className="font-semibold text-sm">Determined Root Cause</h4>
                <p className="text-sm text-destructive p-2 bg-destructive/10 rounded-md">{report.correctiveActionPlan.rootCause}</p>
            </div>
             <div>
                <h4 className="font-semibold text-sm">Corrective Actions</h4>
                <div className="space-y-2">
                    {report.correctiveActionPlan.correctiveActions.map((action) => (
                       <ActionItem 
                            key={action.id} 
                            action={action} 
                            personnel={personnel}
                            onUpdate={handleUpdateAction}
                            onDelete={handleDeleteAction}
                            onAddComment={handleAddComment}
                        />
                    ))}
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
