
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Bot, Save, ListChecks } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateChecklistAction } from './actions';
import type { GenerateAuditChecklistOutput } from '@/ai/flows/generate-audit-checklist-flow';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AuditArea, AuditChecklist } from '@/lib/types';

const AUDIT_AREAS: AuditArea[] = ['Personnel', 'Maintenance', 'Facilities', 'Records', 'Management', 'Flight Operations', 'Ground Ops'];

const initialState: {
  message: string;
  data: GenerateAuditChecklistOutput | null;
  errors: any;
} = {
  message: '',
  data: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Generate Checklist
    </Button>
  );
}

interface AiChecklistGeneratorProps {
  onSave: (data: Omit<AuditChecklist, 'id' | 'companyId'>) => void;
}

export function AiChecklistGenerator({ onSave }: AiChecklistGeneratorProps) {
  const [state, formAction] = useActionState(generateChecklistAction, initialState);
  const [area, setArea] = useState<AuditArea | ''>('');
  const { toast } = useToast();

  useEffect(() => {
    if (state.message && !state.message.includes('complete')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state.message, toast]);

  const handleSave = () => {
    if (!state.data || !area) {
        toast({ variant: 'destructive', title: 'Cannot Save', description: 'Generated data or audit area is missing.' });
        return;
    }
    const newChecklist: Omit<AuditChecklist, 'id' | 'companyId'> = {
        title: state.data.title,
        area: area,
        items: state.data.items.map(item => ({ ...item, id: `item-${Date.now()}-${Math.random()}`, finding: null })),
    };
    onSave(newChecklist);
  };

  return (
    <div className="space-y-6 pt-4">
      <form action={formAction} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Audit Topic</Label>
            <Input id="topic" name="topic" placeholder="e.g., Hangar Fire Safety" />
            {state.errors?.topic && <p className="text-sm text-destructive">{state.errors.topic[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="numItems">Number of Items</Label>
            <Input id="numItems" name="numItems" type="number" defaultValue="10" />
            {state.errors?.numItems && <p className="text-sm text-destructive">{state.errors.numItems[0]}</p>}
          </div>
        </div>
        <SubmitButton />
      </form>

      {state.data && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold">{state.data.title}</h3>
          <div className="space-y-2">
            <Label>Audit Area for this Checklist</Label>
            <Select onValueChange={(value: AuditArea) => setArea(value)} value={area}>
              <SelectTrigger>
                <SelectValue placeholder="Select an audit area to assign" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 rounded-md border p-4">
            {state.data.items.map((item, index) => (
              <div key={index} className="flex items-start gap-3 text-sm">
                <ListChecks className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={!area}>
                <Save className="mr-2 h-4 w-4"/>
                Save Generated Checklist
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
