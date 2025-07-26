

'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateCapAction } from '@/app/quality/[auditId]/actions';
import { analyzeAuditAction } from '@/app/quality/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AnalyzeQualityAuditOutput } from '@/ai/flows/analyze-quality-audit-flow';
import type { GenerateQualityCapOutput } from '@/ai/flows/generate-quality-cap-flow';
import { Loader2, AlertTriangle, CheckCircle, Trophy, Edit, Bot, FileText, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const initialAnalysisState = {
  message: '',
  data: null,
  errors: null,
};
const initialCapState = {
  message: '',
  data: null,
  errors: null,
};

function AnalyzeButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Analyze Audit Text
    </Button>
  );
}

function SuggestCapButton() {
    const { pending } = useFormStatus();
    return (
      <Button type="submit" disabled={pending} className="w-full sm:w-auto" variant="secondary">
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
        Suggest Corrective Action Plan
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
                <div className="flex-shrink-0 mt-1">{item.icon}</div>
                <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.value}</p>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CapResult({ data, onAccept }: { data: GenerateQualityCapOutput, onAccept: (data: GenerateQualityCapOutput) => void }) {
  const resultItems = [
    { title: "Suggested Root Cause", value: data.rootCause, icon: <FileText className="text-primary"/> },
    { title: "Suggested Corrective Action", value: data.correctiveAction, icon: <Edit className="text-amber-600"/> },
    { title: "Suggested Preventative Action", value: data.preventativeAction, icon: <ShieldCheck className="text-green-600"/> },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>Corrective Action Plan Suggestion</CardTitle>
        <CardDescription>AI-powered recommendations for a corrective action plan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {resultItems.map(item => (
            <div key={item.title} className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">{item.icon}</div>
                <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.value}</p>
                </div>
            </div>
        ))}
      </CardContent>
      <CardFooter>
          <Button className="w-full" onClick={() => onAccept(data)}>
              <Check className="mr-2 h-4 w-4" />
              Apply Suggestion to Plan
          </Button>
      </CardFooter>
    </Card>
  );
}


export function QualityAuditAnalyzer({ auditText, onCapSuggested }: { auditText?: string, onCapSuggested: (data: GenerateQualityCapOutput) => void }) {
  const [analysisState, analysisAction] = useActionState(analyzeAuditAction, initialAnalysisState);
  const [capState, capAction] = useActionState(generateCapAction, initialCapState);
  const { toast } = useToast();
  const [currentAuditText, setCurrentAuditText] = useState(auditText || '');

  useEffect(() => {
    setCurrentAuditText(auditText || '');
  }, [auditText]);

  useEffect(() => {
    if (analysisState.message && analysisState.message !== 'Invalid form data' && analysisState.message !== 'Analysis complete') {
      toast({
        variant: 'destructive',
        title: 'Error Analyzing Text',
        description: analysisState.message,
      });
    }
  }, [analysisState, toast]);

  useEffect(() => {
    if (capState.message && capState.message !== 'Invalid form data' && capState.message !== 'CAP suggestion complete') {
      toast({
        variant: 'destructive',
        title: 'Error Generating CAP',
        description: capState.message,
      });
    }
  }, [capState, toast]);

  return (
    <ScrollArea className="h-[70vh] pr-6">
        <DialogHeader>
            <DialogTitle>AI Audit Analysis</DialogTitle>
            <DialogDescription>
            The AI can analyze the audit text for compliance or suggest a corrective action plan.
            </DialogDescription>
        </DialogHeader>
        <div className="space-y-8 py-4">
            <Card className="h-full flex flex-col">
            <CardContent className="flex-1 flex flex-col pt-6">
                 <form action={analysisAction}>
                    <div className="flex flex-col space-y-1.5 flex-1">
                        <Label htmlFor="auditText">Quality Audit Report</Label>
                        <Textarea
                        id="auditText"
                        name="auditText"
                        placeholder="Paste the full text of the quality audit report here..."
                        className="min-h-[150px] flex-1"
                        value={currentAuditText}
                        onChange={(e) => setCurrentAuditText(e.target.value)}
                        />
                        {(analysisState.errors?.auditText) && (
                            <p className="text-sm text-destructive">{analysisState.errors.auditText[0]}</p>
                        )}
                    </div>
                 </form>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground text-center sm:text-left">This analysis should be verified by a qualified Quality Manager.</p>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <form action={analysisAction} className="w-full">
                        <input type="hidden" name="auditText" value={currentAuditText}/>
                        <AnalyzeButton />
                    </form>
                    <form action={capAction} className="w-full">
                         <input type="hidden" name="auditText" value={currentAuditText}/>
                        <SuggestCapButton />
                    </form>
                </div>
            </CardFooter>
            </Card>

            {analysisState.data && <AnalysisResult data={analysisState.data as AnalyzeQualityAuditOutput} />}
            {capState.data && <CapResult data={capState.data as GenerateQualityCapOutput} onAccept={onCapSuggested} />}
        </div>
    </ScrollArea>
  );
}
