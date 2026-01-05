
'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle, CheckCircle, Info, BarChart, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analyzeSafetyReport } from '@/ai/flows/analyze-safety-report-flow';

function AnalysisResult({ data }: { data: any }) {
    const resultItems = [
        { title: "Overall Tone", value: data.overallTone, icon: <Info className="text-primary"/> },
        { title: "Severity Level", value: data.severityLevel, icon: <AlertTriangle className="text-destructive"/> },
        { title: "Potential Safety Issues", value: data.potentialSafetyIssues.join(', '), icon: <AlertTriangle className="text-destructive"/> },
        { title: "Areas for Investigation", value: data.areasForInvestigation.join(', '), icon: <Info className="text-primary"/> },
        { title: "Compliance Concerns", value: data.complianceConcerns.join(', '), icon: <CheckCircle className="text-green-600"/> },
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
                <div className="flex-shrink-0 mt-1">{item.icon}</div>
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
  const { toast } = useToast();
  const [reportText, setReportText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAnalysisResult(null);
    try {
        const result = await analyzeSafetyReport({ reportText });
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
    <div className="space-y-8">
        <Card>
          <form onSubmit={handleAnalyze}>
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
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    />
                </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground text-center sm:text-left">The analysis is for informational purposes and should be verified by a qualified safety officer.</p>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                    Analyze Report
                </Button>
            </CardFooter>
          </form>
        </Card>
        {analysisResult && <AnalysisResult data={analysisResult} />}
    </div>
  );
}
