
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Bot, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/lib/types';
import type { FiveWhysAnalysisOutput } from '@/ai/flows/five-whys-analysis-flow';
import { fiveWhysAnalysisAction } from './actions';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      Perform 5 Whys Analysis
    </Button>
  );
}

function AnalysisResult({ initialData, onSave }: { initialData: FiveWhysAnalysisOutput; onSave: (data: FiveWhysAnalysisOutput) => void }) {
  const [editableData, setEditableData] = useState(initialData);

  useEffect(() => {
    setEditableData(initialData);
  }, [initialData]);

  const handleWhyChange = (index: number, field: 'why' | 'because', value: string) => {
    const newAnalysis = [...editableData.analysis];
    newAnalysis[index] = { ...newAnalysis[index], [field]: value };
    setEditableData({ ...editableData, analysis: newAnalysis });
  };

  const handleProblemStatementChange = (value: string) => {
    setEditableData({ ...editableData, problemStatement: value });
  };
  
  const handleRootCauseChange = (value: string) => {
    setEditableData({ ...editableData, rootCause: value });
  };

  return (
    <div className="mt-4 space-y-4">
        <div>
            <Label htmlFor="problemStatement" className="font-semibold text-sm">Problem Statement</Label>
            <Textarea 
                id="problemStatement"
                value={editableData.problemStatement}
                onChange={(e) => handleProblemStatementChange(e.target.value)}
                className="mt-1"
            />
        </div>
        <div className="space-y-4">
            {editableData.analysis.map((item, index) => (
                <div key={index} className="space-y-2">
                    <Label htmlFor={`why-${index}`} className="font-semibold text-sm">{index + 1}. Why?</Label>
                    <Input
                        id={`why-${index}`}
                        value={item.why}
                        onChange={(e) => handleWhyChange(index, 'why', e.target.value)}
                    />
                    <Label htmlFor={`because-${index}`} className="font-semibold text-sm">Because...</Label>
                    <Textarea
                        id={`because-${index}`}
                        value={item.because}
                        onChange={(e) => handleWhyChange(index, 'because', e.target.value)}
                        className="min-h-[60px]"
                    />
                </div>
            ))}
        </div>
        <Separator />
        <div>
            <Label htmlFor="rootCause" className="font-semibold text-sm">Determined Root Cause</Label>
            <Textarea 
                id="rootCause"
                value={editableData.rootCause}
                onChange={(e) => handleRootCauseChange(e.target.value)}
                className="mt-1 text-destructive border-destructive/50"
            />
        </div>
        <div className="flex justify-end">
            <Button onClick={() => onSave(editableData)}>
                <Save className="mr-2 h-4 w-4" />
                Save Analysis
            </Button>
        </div>
    </div>
  );
}

export function FiveWhysGenerator({ report, onUpdate }: { report: SafetyReport, onUpdate?: (data: Partial<SafetyReport>) => void }) {
  const [state, formAction] = useActionState(fiveWhysAnalysisAction, initialState);
  const { toast } = useToast();
  const [analysisData, setAnalysisData] = useState<FiveWhysAnalysisOutput | null>(report.fiveWhysAnalysis || null);

  useEffect(() => {
    if (state.data) {
        setAnalysisData(state.data as FiveWhysAnalysisOutput);
    }
    if (state.message && !state.message.includes('complete')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  const handleSave = (data: FiveWhysAnalysisOutput) => {
    if (typeof onUpdate === 'function') {
      onUpdate({ fiveWhysAnalysis: data });
      toast({
          title: 'Analysis Saved',
          description: 'Your changes to the 5 Whys analysis have been saved.',
      });
    }
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-2">Use the 5 Whys method to drill down to the root cause of the incident.</p>
      <form action={formAction}>
          <input type="hidden" name="report" value={JSON.stringify(report)} />
          <SubmitButton />
      </form>
      {analysisData && <AnalysisResult initialData={analysisData} onSave={handleSave} />}
    </div>
  );
}
