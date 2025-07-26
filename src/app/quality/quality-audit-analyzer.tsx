
'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { analyzeAuditAction } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AnalyzeQualityAuditOutput } from '@/ai/flows/analyze-quality-audit-flow';
import { Loader2, AlertTriangle, CheckCircle, Trophy, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState = {
  message: '',
  data: null,
  errors: null,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Analyze Audit
    </Button>
  );
}

function AnalysisResult({ data }: { data: AnalyzeQualityAuditOutput }) {
    const resultItems = [
        { title: "Overall Compliance", value: data.overallCompliance, icon: <CheckCircle className="text-green-600"/> },
        { title: "Non-Conformance Issues", value: data.nonConformanceIssues, icon: <AlertTriangle className="text-destructive"/> },
        { title: "Suggested Corrective Actions", value: data.suggestedCorrectiveActions, icon: <Edit className="text-primary"/> },
        { title: "Areas of Excellence", value: data.areasOfExcellence, icon: <Trophy className="text-yellow-500"/> },
    ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit Analysis Results</CardTitle>
        <CardDescription>AI-powered assessment of the submitted quality audit report.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {resultItems.map(item => (
            <div key={item.title} className="flex items-start space-x-4">
                <div className="flex-shrink-0">{item.icon}</div>
                <div>
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-muted-foreground">{item.value}</p>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function QualityAuditAnalyzer({ auditText }: { auditText?: string }) {
  const [state, formAction] = useActionState(analyzeAuditAction, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message && state.message !== 'Invalid form data' && state.message !== 'Analysis complete') {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <div className="space-y-8">
      <form action={formAction}>
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>Quality Audit Analysis Tool</CardTitle>
            <CardDescription>
              Enter a quality audit report below. Our AI will assess compliance and suggest actions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex flex-col space-y-1.5 flex-1">
                <Label htmlFor="auditText">Quality Audit Report</Label>
                <Textarea
                  id="auditText"
                  name="auditText"
                  placeholder="Paste the full text of the quality audit report here..."
                  className="min-h-[150px] flex-1"
                  defaultValue={auditText}
                />
                {state.errors?.auditText && (
                  <p className="text-sm text-destructive">{state.errors.auditText[0]}</p>
                )}
              </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">This analysis should be verified by a qualified Quality Manager.</p>
            <SubmitButton />
          </CardFooter>
        </Card>
      </form>
      {state.data && <AnalysisResult data={state.data as AnalyzeQualityAuditOutput} />}
    </div>
  );
}
