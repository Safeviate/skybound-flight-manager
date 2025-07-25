
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/lib/types';
import type { FiveWhysAnalysisOutput } from '@/ai/flows/five-whys-analysis-flow';
import { fiveWhysAnalysisAction } from './actions';
import { Separator } from '@/components/ui/separator';

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

function AnalysisResult({ data }: { data: FiveWhysAnalysisOutput }) {
  return (
    <div className="mt-4 space-y-4">
        <div>
            <h4 className="font-semibold text-sm">Problem Statement</h4>
            <p className="text-sm text-muted-foreground p-2 bg-muted rounded-md">{data.problemStatement}</p>
        </div>
        <div className="space-y-2">
            {data.analysis.map((item, index) => (
                <div key={index} className="space-y-1">
                    <p className="font-semibold text-sm">{index + 1}. {item.why}</p>
                    <p className="text-sm border-l-2 pl-3 ml-2 text-muted-foreground"><span className="font-medium text-foreground">Because:</span> {item.because}</p>
                </div>
            ))}
        </div>
        <Separator />
        <div>
            <h4 className="font-semibold text-sm">Determined Root Cause</h4>
            <p className="text-sm text-destructive p-2 bg-destructive/10 rounded-md">{data.rootCause}</p>
        </div>
    </div>
  );
}

export function FiveWhysGenerator({ report }: { report: SafetyReport }) {
  const [state, formAction] = useActionState(fiveWhysAnalysisAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message && !state.message.includes('complete')) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <Card>
        <CardHeader>
            <CardTitle className="text-base">Root Cause Analysis</CardTitle>
            <CardDescription className="text-xs">Use the 5 Whys method to drill down to the root cause of the incident.</CardDescription>
        </CardHeader>
        <CardContent>
            <form action={formAction}>
                <input type="hidden" name="report" value={JSON.stringify(report)} />
                <SubmitButton />
            </form>
            {state.data && <AnalysisResult data={state.data as FiveWhysAnalysisOutput} />}
        </CardContent>
    </Card>
  );
}
