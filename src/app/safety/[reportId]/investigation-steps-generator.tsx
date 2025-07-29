

'use client';

import { useActionState, useEffect, useState, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Bot, Clipboard, CheckCircle, CalendarIcon, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport, SuggestInvestigationStepsOutput, InvestigationTask, User as Personnel } from '@/lib/types';
import { suggestStepsAction } from './actions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';


const initialState = {
  message: '',
  data: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Suggest Investigation Steps
    </Button>
  );
}

function AnalysisResult({ data, personnel, onAssignTasks }: { data: SuggestInvestigationStepsOutput, personnel: Personnel[], onAssignTasks: (tasks: Omit<InvestigationTask, 'id'|'status'>[]) => void }) {
    const [checkedItems, setCheckedItems] = useState<Record<string, string[]>>({});
    const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
    const [taskAssignments, setTaskAssignments] = useState<Record<string, { assignedTo: string, dueDate: Date }>>({});
    const [suggestionsHidden, setSuggestionsHidden] = useState(false);


    const allSuggestions = useMemo(() => [
        ...data.keyAreasToInvestigate,
        ...data.recommendedActions,
        ...data.potentialContributingFactors,
    ], [data]);

    const handleCheckedChange = (group: string, value: string, isChecked: boolean) => {
        setCheckedItems(prev => {
            const groupItems = prev[group] || [];
            if (isChecked) {
                return { ...prev, [group]: [...groupItems, value] };
            } else {
                return { ...prev, [group]: groupItems.filter(item => item !== value) };
            }
        });
    };
    
    const selectedTaskDescriptions = useMemo(() => {
        return Object.values(checkedItems).flat();
    }, [checkedItems]);


    const handleAssignClick = () => {
        // Pre-populate assignments with default values
        const initialAssignments = selectedTaskDescriptions.reduce((acc, desc) => {
            acc[desc] = { assignedTo: '', dueDate: addDays(new Date(), 7) };
            return acc;
        }, {} as Record<string, { assignedTo: string, dueDate: Date }>);
        setTaskAssignments(initialAssignments);
        setIsAssignDialogOpen(true);
    }
    
    const handleAssignmentChange = (taskDesc: string, field: 'assignedTo' | 'dueDate', value: string | Date) => {
        setTaskAssignments(prev => ({
            ...prev,
            [taskDesc]: { ...prev[taskDesc], [field]: value }
        }));
    }

    const handleConfirmAssignments = () => {
        const newTasks = selectedTaskDescriptions.map(desc => ({
            description: desc,
            assignedTo: taskAssignments[desc].assignedTo,
            dueDate: format(taskAssignments[desc].dueDate, 'yyyy-MM-dd'),
        }));
        
        onAssignTasks(newTasks as Omit<InvestigationTask, 'id'|'status'>[]);
        setIsAssignDialogOpen(false);
        setSuggestionsHidden(true); // Hide suggestions after assigning
    };

    const resultItems = [
        { title: "Initial Assessment", value: data.initialAssessment, key: 'initialAssessment' },
        { title: "Key Areas to Investigate", value: data.keyAreasToInvestigate, key: 'keyAreasToInvestigate' },
        { title: "Recommended Immediate Actions", value: data.recommendedActions, key: 'recommendedActions' },
        { title: "Potential Contributing Factors", value: data.potentialContributingFactors, key: 'potentialContributingFactors' },
    ];

    const isAnyCheckboxChecked = Object.values(checkedItems).some(arr => arr.length > 0);

    if (suggestionsHidden) {
        return (
            <div className="mt-4 flex flex-col items-center justify-center rounded-lg border bg-muted p-6 text-center">
                 <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                 <h4 className="font-semibold">Tasks Assigned</h4>
                <p className="text-sm text-muted-foreground">
                    Tasks have been created based on the AI suggestions. You can view them in the task list.
                </p>
                 <Button variant="link" size="sm" onClick={() => setSuggestionsHidden(false)} className="mt-2">Show Suggestions Again</Button>
            </div>
        );
    }

    return (
        <div className="mt-4 space-y-4">
            {resultItems.map(item => (
                <div key={item.title}>
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    {Array.isArray(item.value) ? (
                        <div className="text-sm text-muted-foreground mt-1 space-y-2">
                            {item.value.map((v, i) => (
                                <div key={i} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`${item.key}-${i}`} 
                                        onCheckedChange={(checked) => handleCheckedChange(item.key, v, !!checked)} 
                                        checked={checkedItems[item.key]?.includes(v) || false}
                                    />
                                    <Label htmlFor={`${item.key}-${i}`} className="font-normal cursor-pointer">{v}</Label>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground mt-1">{item.value}</p>
                    )}
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={handleAssignClick} disabled={!isAnyCheckboxChecked}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Assign Selected as Tasks
            </Button>
            
            <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign Investigation Tasks</DialogTitle>
                        <DialogDescription>Assign each task to a team member and set a due date.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-4">
                        {selectedTaskDescriptions.map(desc => (
                            <div key={desc} className="p-4 border rounded-lg space-y-3">
                                <p className="font-medium text-sm">{desc}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs">Assign To</Label>
                                        <Select
                                            value={taskAssignments[desc]?.assignedTo}
                                            onValueChange={(val) => handleAssignmentChange(desc, 'assignedTo', val)}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Select person..." /></SelectTrigger>
                                            <SelectContent>
                                                {personnel.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Due Date</Label>
                                         <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn("w-full justify-start text-left font-normal", !taskAssignments[desc]?.dueDate && "text-muted-foreground")}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {taskAssignments[desc]?.dueDate ? format(taskAssignments[desc].dueDate, "PPP") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={taskAssignments[desc]?.dueDate}
                                                    onSelect={(date) => handleAssignmentChange(desc, 'dueDate', date || new Date())}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleConfirmAssignments}>Confirm Assignments</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export function InvestigationStepsGenerator({ report, personnel, onAssignTasks }: { report: SafetyReport, personnel: Personnel[], onAssignTasks: (tasks: Omit<InvestigationTask, 'id'|'status'>[]) => void; }) {
  const [state, formAction] = useActionState(suggestStepsAction, initialState);
  const [result, setResult] = useState<SuggestInvestigationStepsOutput | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (state.data) {
      setResult(state.data as SuggestInvestigationStepsOutput);
    }
    if (state.message && state.message !== 'Analysis complete') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <div>
        <p className="text-xs text-muted-foreground mb-2">
            Generate a structured investigation plan based on the report details.
        </p>
        <form action={formAction}>
            <input type="hidden" name="report" value={JSON.stringify(report)} />
            <SubmitButton />
        </form>
        {result && <AnalysisResult data={result} personnel={personnel} onAssignTasks={onAssignTasks} />}
    </div>
  );
}
