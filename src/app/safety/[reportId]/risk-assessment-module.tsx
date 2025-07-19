
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { getRiskScore, getRiskScoreColor } from '@/lib/utils.tsx';
import type { RiskLikelihood, RiskSeverity, SafetyReport } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils.tsx';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';

const likelihoods: RiskLikelihood[] = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Certain'];
const severities: RiskSeverity[] = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

interface RiskAssessmentModuleProps {
    report: SafetyReport;
    onUpdate: (updatedReport: SafetyReport) => void;
}

export function RiskAssessmentModule({ report, onUpdate }: RiskAssessmentModuleProps) {
  const [selectedLikelihood, setSelectedLikelihood] = useState<RiskLikelihood | null>(report.likelihood || null);
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity | null>(report.severity || null);
  const { toast } = useToast();

  const riskScore = selectedLikelihood && selectedSeverity
    ? getRiskScore(selectedLikelihood, selectedSeverity)
    : null;

  const riskLevel = (score: number | null) => {
      if (score === null) return 'N/A';
      if (score <= 4) return 'Low';
      if (score <= 9) return 'Medium';
      if (score <= 16) return 'High';
      return 'Extreme';
  }

  const handleSaveAssessment = () => {
    if (!selectedLikelihood || !selectedSeverity || riskScore === null) {
        toast({
            variant: 'destructive',
            title: 'Incomplete Assessment',
            description: 'Please select both a likelihood and a severity from the matrix.'
        });
        return;
    }
    const updatedReport: SafetyReport = {
        ...report,
        likelihood: selectedLikelihood,
        severity: selectedSeverity,
        riskScore: riskScore,
    };
    onUpdate(updatedReport);
    toast({
        title: 'Risk Assessment Saved',
        description: `The risk score of ${riskScore} has been saved for this report.`,
    })
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
            <CardDescription>
                Use the matrix to assess the risk associated with this safety report.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                     <div className="overflow-x-auto">
                        <Table className="border text-xs">
                            <TableHeader>
                            <TableRow>
                                <TableHead className="border-r font-bold p-2 align-bottom">Likelihood</TableHead>
                                <TableHead colSpan={severities.length} className="text-center font-bold p-2">Severity</TableHead>
                            </TableRow>
                            <TableRow>
                                <TableHead className="border-r p-2"></TableHead>
                                {severities.map(s => <TableHead key={s} className="text-center p-2 text-muted-foreground">{s}</TableHead>)}
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {likelihoods.slice().reverse().map(l => (
                                <TableRow key={l}>
                                <TableCell className="font-semibold border-r p-2 text-muted-foreground">{l}</TableCell>
                                {severities.map(s => {
                                    const score = getRiskScore(l, s);
                                    const isSelected = l === selectedLikelihood && s === selectedSeverity;
                                    return (
                                    <TableCell
                                        key={s}
                                        className={cn(
                                        'text-center cursor-pointer border-l p-2 font-medium',
                                        isSelected && 'ring-2 ring-primary ring-inset'
                                        )}
                                        style={{ backgroundColor: isSelected ? 'hsl(var(--primary-foreground))' : getRiskScoreColor(score, 0.2) }}
                                        onClick={() => {
                                        setSelectedLikelihood(l);
                                        setSelectedSeverity(s);
                                        }}
                                    >
                                        {score}
                                    </TableCell>
                                    )
                                })}
                                </TableRow>
                            ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
                <div className="md:col-span-1 space-y-4">
                     <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Assessment Result</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center justify-center space-y-2">
                        {riskScore !== null ? (
                            <>
                            <div className="text-5xl font-bold" style={{ color: getRiskScoreColor(riskScore) }}>
                                {riskScore}
                            </div>
                            <Badge className="text-md" style={{ backgroundColor: getRiskScoreColor(riskScore), color: 'white' }}>
                                {riskLevel(riskScore)} Risk
                            </Badge>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-24 text-muted-foreground text-center">
                                Select from matrix to see score.
                            </div>
                        )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex justify-end">
            <Button onClick={handleSaveAssessment}>
                <Check className="mr-2 h-4 w-4" />
                Save Risk Assessment
            </Button>
        </CardFooter>
    </Card>
  );
}
