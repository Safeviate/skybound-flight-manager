
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle, CheckCircle, Trophy, Edit, Bot, FileText, ShieldCheck, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { analyzeSafetyReport } from '@/ai/flows/analyze-safety-report-flow';


function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Analyze Audit Text
    </Button>
  );
}

function AnalysisResult({ data }: { data: any }) {
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


export function QualityAuditAnalyzer({ auditText, onCapSuggested }: { auditText?: string, onCapSuggested: (data: any) => void }) {
  const { toast } = useToast();
  const [currentAuditText, setCurrentAuditText] = useState(auditText || '');
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalysis = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setAnalysisResult(null);
    try {
        const result = await analyzeSafetyReport({ reportText: currentAuditText });
        setAnalysisResult(result);
    } catch(e) {
        toast({
            variant: "destructive",
            title: "Analysis Failed",
            description: "An error occurred while analyzing the report.",
        });
    } finally {
        setIsLoading(false);
    }
  }

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
                <form onSubmit={handleAnalysis}>
                    <CardContent className="flex-1 flex flex-col pt-6">
                            <div className="flex flex-col space-y-1.5 flex-1">
                                <Label htmlFor="auditText">Quality Audit Report</Label>
                                <Textarea
                                id="auditText"
                                name="reportText"
                                placeholder="Paste the full text of the quality audit report here..."
                                className="min-h-[150px] flex-1"
                                value={currentAuditText}
                                onChange={(e) => setCurrentAuditText(e.target.value)}
                                />
                            </div>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <p className="text-sm text-muted-foreground text-center sm:text-left">This analysis should be verified by a qualified Quality Manager.</p>
                        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto bg-accent hover:bg-accent/90">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                            Analyze Audit Text
                        </Button>
                    </CardFooter>
                </form>
            </Card>
            {analysisResult && <AnalysisResult data={analysisResult} />}
        </div>
    </ScrollArea>
  );
}
