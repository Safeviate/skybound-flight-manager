
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Bot, Clipboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/lib/types';
import type { SuggestInvestigationStepsOutput } from '@/ai/flows/suggest-investigation-steps-flow';
import { suggestStepsAction } from './actions';

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

function AnalysisResult({ data, onCopyToClipboard }: { data: SuggestInvestigationStepsOutput, onCopyToClipboard: (text: string) => void }) {
    const resultItems = [
        { title: "Initial Assessment", value: data.initialAssessment },
        { title: "Key Areas to Investigate", value: data.keyAreasToInvestigate },
        { title: "Recommended Immediate Actions", value: data.recommendedActions },
        { title: "Potential Contributing Factors", value: data.potentialContributingFactors },
    ];
    
    const formattedText = resultItems.map(item => 
        `## ${item.title}\n${Array.isArray(item.value) ? item.value.map(v => `- ${v}`).join('\n') : item.value}`
    ).join('\n\n');

    return (
        <div className="mt-4 space-y-4">
            {resultItems.map(item => (
                <div key={item.title}>
                    <h4 className="font-semibold text-sm">{item.title}</h4>
                    {Array.isArray(item.value) ? (
                        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
                            {item.value.map((v, i) => <li key={i}>{v}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground mt-1">{item.value}</p>
                    )}
                </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => onCopyToClipboard(formattedText)}>
                <Clipboard className="mr-2 h-4 w-4" />
                Copy Suggestions
            </Button>
        </div>
    );
}

export function InvestigationStepsGenerator({ report }: { report: SafetyReport }) {
  const [state, formAction] = useActionState(suggestStepsAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message && state.message !== 'Analysis complete') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
        title: "Copied to Clipboard",
        description: "The AI suggestions have been copied.",
    });
  }

  return (
    <div>
        <p className="text-xs text-muted-foreground mb-2">
            Generate a structured investigation plan based on the report details.
        </p>
        <form action={formAction}>
            <input type="hidden" name="report" value={JSON.stringify(report)} />
            <SubmitButton />
        </form>
        {state.data && <AnalysisResult data={state.data as SuggestInvestigationStepsOutput} onCopyToClipboard={copyToClipboard} />}
    </div>
  );
}
