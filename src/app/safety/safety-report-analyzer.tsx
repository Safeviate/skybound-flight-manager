
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { analyzeReportAction } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AnalyzeSafetyReportToneOutput } from '@/ai/flows/analyze-safety-report-tone';
import { Loader2, AlertTriangle, CheckCircle, Info, BarChart } from 'lucide-react';
import { useEffect } from 'react';
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
      Analyze Report
    </Button>
  );
}

function AnalysisResult({ data }: { data: AnalyzeSafetyReportToneOutput }) {
    const resultItems = [
        { title: "Overall Tone", value: data.overallTone, icon: <Info className="text-primary"/> },
        { title: "Severity Level", value: data.severityLevel, icon: <AlertTriangle className="text-destructive"/> },
        { title: "Potential Safety Issues", value: data.potentialSafetyIssues, icon: <AlertTriangle className="text-destructive"/> },
        { title: "Areas for Investigation", value: data.areasForInvestigation, icon: <Info className="text-primary"/> },
        { title: "Compliance Concerns", value: data.complianceConcerns, icon: <CheckCircle className="text-green-600"/> },
        { title: "Impact on Operations", value: data.impactOnOperations, icon: <BarChart className="text-primary"/> },
    ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Results</CardTitle>
        <CardDescription>AI-powered assessment of the submitted safety report.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
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

export function SafetyReportAnalyzer() {
  const [state, formAction] = useFormState(analyzeReportAction, initialState);
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
        <Card>
          <CardHeader>
            <CardTitle>Smart Safety Reporting Tool</CardTitle>
            <CardDescription>
              Enter a safety report below. Our AI will assess the tone, severity, and potential issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="reportText">Safety Report Text</Label>
                <Textarea
                  id="reportText"
                  name="reportText"
                  placeholder="Paste the full text of the safety report here..."
                  className="min-h-[200px]"
                />
                {state.errors?.reportText && (
                  <p className="text-sm text-destructive">{state.errors.reportText[0]}</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">The analysis is for informational purposes and should be verified by a qualified safety officer.</p>
            <SubmitButton />
          </CardFooter>
        </Card>
      </form>
      {state.data && <AnalysisResult data={state.data as AnalyzeSafetyReportToneOutput} />}
    </div>
  );
}
