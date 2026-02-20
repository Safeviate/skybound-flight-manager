'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Save, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SafetyReport, FiveWhysAnalysisOutput } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function FiveWhysGenerator({ report, onUpdate }: { report: SafetyReport, onUpdate?: (data: Partial<SafetyReport>) => void }) {
  const { toast } = useToast();
  const [analysisData, setAnalysisData] = useState<FiveWhysAnalysisOutput>(report.fiveWhysAnalysis || {
      problemStatement: '',
      analysis: [
          { why: '', because: '' },
          { why: '', because: '' },
          { why: '', because: '' },
          { why: '', because: '' },
          { why: '', because: '' },
      ],
      rootCause: ''
  });

  const handleWhyChange = (index: number, field: 'why' | 'because', value: string) => {
    const newAnalysis = [...analysisData.analysis];
    newAnalysis[index] = { ...newAnalysis[index], [field]: value };
    setAnalysisData({ ...analysisData, analysis: newAnalysis });
  };

  const handleProblemStatementChange = (value: string) => {
    setAnalysisData({ ...analysisData, problemStatement: value });
  };
  
  const handleRootCauseChange = (value: string) => {
    setAnalysisData({ ...analysisData, rootCause: value });
  };

  const handleSave = () => {
    if (typeof onUpdate === 'function') {
      onUpdate({ fiveWhysAnalysis: analysisData });
      toast({
          title: 'Analysis Saved',
          description: 'The 5 Whys analysis has been updated.',
      });
    }
  }

  return (
    <div className="space-y-4">
        <div className="flex items-center justify-between">
            <div>
                <h4 className="font-semibold text-sm">5 Whys Analysis</h4>
                <p className="text-xs text-muted-foreground">Drill down to the root cause of the incident.</p>
            </div>
            <Button onClick={handleSave} size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save Analysis
            </Button>
        </div>
        
        <div>
            <Label htmlFor="problemStatement" className="text-xs font-semibold">Problem Statement</Label>
            <Textarea 
                id="problemStatement"
                placeholder="State the problem clearly..."
                value={analysisData.problemStatement}
                onChange={(e) => handleProblemStatementChange(e.target.value)}
                className="mt-1 min-h-[60px]"
            />
        </div>

        <div className="space-y-4">
            {analysisData.analysis.map((item, index) => (
                <div key={index} className="space-y-2 p-3 border rounded-md bg-muted/30">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">{index + 1}. Why?</Label>
                    <Input
                        placeholder={`Why did this happen?`}
                        value={item.why}
                        onChange={(e) => handleWhyChange(index, 'why', e.target.value)}
                    />
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Because...</Label>
                    <Textarea
                        placeholder={`Because...`}
                        value={item.because}
                        onChange={(e) => handleWhyChange(index, 'because', e.target.value)}
                        className="min-h-[60px]"
                    />
                </div>
            ))}
        </div>

        <Separator />
        
        <div>
            <Label htmlFor="rootCause" className="text-xs font-bold text-destructive">Determined Root Cause</Label>
            <Textarea 
                id="rootCause"
                placeholder="The final determined root cause..."
                value={analysisData.rootCause}
                onChange={(e) => handleRootCauseChange(e.target.value)}
                className="mt-1 border-destructive/50"
            />
        </div>
    </div>
  );
}
