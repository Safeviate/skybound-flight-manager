
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Bot, Clipboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport } from '@/lib/types';
import type { SuggestInvestigationStepsOutput } from '@/ai/flows/suggest-investigation-steps-flow';
import { suggestStepsAction } from './actions';
import { Checkbox } from '@/components/ui/checkbox';
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
      Suggest Investigation Steps
    </Button>
  );
}

function AnalysisResult({ data, onCopyToClipboard }: { data: SuggestInvestigationStepsOutput, onCopyToClipboard: (text: string) => void }) {
    const [checkedItems, setCheckedItems] = useState<Record<string, string[]>>({});

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

    const handleCopyToClipboard = () => {
        const sections = [
            { title: "Key Areas to Investigate", items: checkedItems.keyAreasToInvestigate },
            { title: "Recommended Immediate Actions", items: checkedItems.recommendedActions },
            { title: "Potential Contributing Factors", items: checkedItems.potentialContributingFactors },
        ];

        const formattedText = sections
            .filter(section => section.items && section.items.length > 0)
            .map(section => `## ${section.title}\n${section.items.map(item => `- ${item}`).join('\n')}`)
            .join('\n\n');

        onCopyToClipboard(formattedText);
    };

    const resultItems = [
        { title: "Initial Assessment", value: data.initialAssessment, key: 'initialAssessment' },
        { title: "Key Areas to Investigate", value: data.keyAreasToInvestigate, key: 'keyAreasToInvestigate' },
        { title: "Recommended Immediate Actions", value: data.recommendedActions, key: 'recommendedActions' },
        { title: "Potential Contributing Factors", value: data.potentialContributingFactors, key: 'potentialContributingFactors' },
    ];

    const isAnyCheckboxChecked = Object.values(checkedItems).some(arr => arr.length > 0);

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
            <Button variant="outline" size="sm" onClick={handleCopyToClipboard} disabled={!isAnyCheckboxChecked}>
                <Clipboard className="mr-2 h-4 w-4" />
                Copy Selected Suggestions
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
        description: "The selected AI suggestions have been copied.",
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
