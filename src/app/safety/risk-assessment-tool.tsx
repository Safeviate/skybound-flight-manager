

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRiskScore, getRiskScoreColorWithOpacity } from '@/lib/utils.tsx';
import type { RiskLikelihood, RiskSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils.tsx';

const likelihoods: RiskLikelihood[] = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Certain'];
const severities: RiskSeverity[] = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

interface RiskAssessmentToolProps {
  onAssessmentChange?: (likelihood: RiskLikelihood | null, severity: RiskSeverity | null) => void;
  showResultCard?: boolean;
  initialLikelihood?: RiskLikelihood | null;
  initialSeverity?: RiskSeverity | null;
}

export function RiskAssessmentTool({ 
    onAssessmentChange, 
    showResultCard = true, 
    initialLikelihood = null,
    initialSeverity = null
}: RiskAssessmentToolProps) {
  const [selectedLikelihood, setSelectedLikelihood] = useState<RiskLikelihood | null>(initialLikelihood);
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity | null>(initialSeverity);

  useEffect(() => {
    setSelectedLikelihood(initialLikelihood);
    setSelectedSeverity(initialSeverity);
  }, [initialLikelihood, initialSeverity])

  const riskScore = selectedLikelihood && selectedSeverity
    ? getRiskScore(selectedLikelihood, selectedSeverity)
    : null;

  const riskLevel = (score: number | null) => {
      if (score === null || score === undefined) return 'N/A';
      if (score <= 4) return 'Low';
      if (score <= 9) return 'Medium';
      if (score <= 16) return 'High';
      return 'Extreme';
  }

  const handleCellClick = (l: RiskLikelihood, s: RiskSeverity) => {
      setSelectedLikelihood(l);
      setSelectedSeverity(s);
      if (onAssessmentChange) {
          onAssessmentChange(l, s);
      }
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardContent className="p-0 md:p-2">
            <div className="overflow-x-auto">
              <Table className="border text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="border-r font-bold p-1 h-8">Likelihood</TableHead>
                    <TableHead colSpan={severities.length} className="text-center font-bold p-1 h-8">Severity</TableHead>
                  </TableRow>
                  <TableRow>
                    <TableHead className="border-r p-1 h-8"></TableHead>
                    {severities.map(s => <TableHead key={s} className="text-center p-1 h-8 text-muted-foreground font-normal">{s}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {likelihoods.slice().reverse().map(l => (
                    <TableRow key={l}>
                      <TableCell className="font-semibold border-r p-1">{l}</TableCell>
                      {severities.map(s => {
                        const score = getRiskScore(l, s);
                        const isSelected = l === selectedLikelihood && s === selectedSeverity;
                        return (
                          <TableCell
                            key={s}
                            className={cn(
                              'text-center cursor-pointer border-l hover:bg-muted/50 p-1 h-8 w-8 font-medium text-foreground/80',
                              isSelected && 'ring-2 ring-primary ring-inset'
                            )}
                            style={{ backgroundColor: isSelected ? 'hsl(var(--primary-foreground))' : getRiskScoreColorWithOpacity(score, 0.2) }}
                            onClick={() => handleCellClick(l, s)}
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
          </CardContent>
        </Card>
      </div>

      {showResultCard && (
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">Selected Likelihood:</h4>
                <p>{selectedLikelihood || 'Not selected'}</p>
              </div>
              <div>
                <h4 className="font-semibold">Selected Severity:</h4>
                <p>{selectedSeverity || 'Not selected'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-4">
                {riskScore !== null ? (
                  <>
                    <div className="text-6xl font-bold" style={{ color: getRiskScoreColor(riskScore) }}>
                      {riskScore}
                    </div>
                    <Badge className="text-lg" style={{ backgroundColor: getRiskScoreColor(riskScore), color: 'white' }}>
                      {riskLevel(riskScore)}
                    </Badge>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-24 text-muted-foreground">
                    Select from matrix to see score.
                  </div>
                )}
              </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
