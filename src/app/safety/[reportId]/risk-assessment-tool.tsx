
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRiskScoreColor, getRiskLevel } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';

const SEVERITY_LEVELS = {
    'Catastrophic': { description: 'Equipment destroyed, multiple deaths.', value: 5 },
    'Hazardous': { description: 'Large reduction in safety margins, serious injury, major equipment damage.', value: 4 },
    'Major': { description: 'Significant reduction in safety margins, serious incident, injury to persons.', value: 3 },
    'Minor': { description: 'Nuisance, operating limitations, minor incident.', value: 2 },
    'Negligible': { description: 'Little or no effect on safety.', value: 1 },
};

const LIKELIHOOD_LEVELS = {
    'Frequent': { description: 'Likely to occur many times (has happened frequently).', value: 'A' },
    'Occasional': { description: 'Likely to occur some times (has happened infrequently).', value: 'B' },
    'Remote': { description: 'Unlikely, but possible to occur (has happened rarely).', value: 'C' },
    'Improbable': { description: 'Very unlikely to occur (not known to have happened).', value: 'D' },
    'Extremely Improbable': { description: 'Almost inconceivable that the event will occur.', value: 'E' },
};

const RISK_MATRIX_DATA: Record<string, Record<string, string>> = {
    '5': { 'A': '5A', 'B': '5B', 'C': '5C', 'D': '5D', 'E': '5E' },
    '4': { 'A': '4A', 'B': '4B', 'C': '4C', 'D': '4D', 'E': '4E' },
    '3': { 'A': '3A', 'B': '3B', 'C': '3C', 'D': '3D', 'E': '3E' },
    '2': { 'A': '2A', 'B': '2B', 'C': '2C', 'D': '2D', 'E': '2E' },
    '1': { 'A': '1A', 'B': '1B', 'C': '1C', 'D': '1D', 'E': '1E' },
};

const RISK_CLASSIFICATION: Record<string, { level: 'Intolerable' | 'Tolerable' | 'Acceptable', color: string }> = {
    '5A': { level: 'Intolerable', color: 'hsl(var(--destructive))' }, '5B': { level: 'Intolerable', color: 'hsl(var(--destructive))' }, '5C': { level: 'Intolerable', color: 'hsl(var(--destructive))' },
    '4A': { level: 'Intolerable', color: 'hsl(var(--destructive))' }, '4B': { level: 'Intolerable', color: 'hsl(var(--destructive))' },
    '3A': { level: 'Intolerable', color: 'hsl(var(--destructive))' },
    '5D': { level: 'Tolerable', color: 'hsl(var(--orange))' },
    '4E': { level: 'Tolerable', color: 'hsl(var(--orange))' },
    '4C': { level: 'Tolerable', color: 'hsl(var(--orange))' }, '4D': { level: 'Tolerable', color: 'hsl(var(--orange))' },
    '3B': { level: 'Tolerable', color: 'hsl(var(--orange))' }, '3C': { level: 'Tolerable', color: 'hsl(var(--orange))' },
    '2A': { level: 'Tolerable', color: 'hsl(var(--orange))' }, '2B': { level: 'Tolerable', color: 'hsl(var(--orange))' },
    '1A': { level: 'Tolerable', color: 'hsl(var(--orange))' },
    '4E': { level: 'Acceptable', color: 'hsl(var(--success))' },
    '3D': { level: 'Acceptable', color: 'hsl(var(--success))' }, '3E': { level: 'Acceptable', color: 'hsl(var(--success))' },
    '2C': { level: 'Acceptable', color: 'hsl(var(--success))' }, '2D': { level: 'Acceptable', color: 'hsl(var(--success))' }, '2E': { level: 'Acceptable', color: 'hsl(var(--success))' },
    '1B': { level: 'Acceptable', color: 'hsl(var(--success))' }, '1C': { level: 'Acceptable', color: 'hsl(var(--success))' }, '1D': { level: 'Acceptable', color: 'hsl(var(--success))' }, '1E': { level: 'Acceptable', color: 'hsl(var(--success))' },
};


export function RiskAssessmentTool() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ICAO Risk Assessment Matrix</CardTitle>
        <CardDescription>
          This matrix is used to determine the level of risk associated with an identified hazard, based on ICAO Document 9859 (Safety Management Manual).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table className="border">
                <TableHeader>
                    <TableRow>
                        <TableHead className="border-r" rowSpan={2}>Severity</TableHead>
                        <TableHead className="text-center" colSpan={5}>Likelihood of Occurrence</TableHead>
                    </TableRow>
                    <TableRow>
                        {Object.entries(LIKELIHOOD_LEVELS).map(([level, { description, value }]) => (
                            <TableHead key={level} className="border-t text-center p-2">
                                <div>{level}</div>
                                <div className="text-xs font-normal text-muted-foreground">({value})</div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(SEVERITY_LEVELS).reverse().map(([level, { description, value }]) => (
                        <TableRow key={level}>
                            <TableCell className="border-r p-2 font-semibold">
                                <div>{level}</div>
                                <div className="text-xs font-normal text-muted-foreground">({value})</div>
                            </TableCell>
                            {Object.values(LIKELIHOOD_LEVELS).map(({ value: likelihoodValue }) => {
                                const riskCode = RISK_MATRIX_DATA[value][likelihoodValue];
                                const classification = RISK_CLASSIFICATION[riskCode];
                                return (
                                <TableCell key={`${value}-${likelihoodValue}`} className="p-2 text-center" style={{ backgroundColor: classification?.color }}>
                                    <div className="font-bold text-white">{riskCode}</div>
                                </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Risk Tolerability</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: 'hsl(var(--destructive))'}}/> <div><span className="font-bold">Intolerable:</span> Risk that cannot be justified.</div></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: 'hsl(var(--orange))'}}/> <div><span className="font-bold">Tolerable:</span> Risk acceptable if As Low As Reasonably Practicable (ALARP).</div></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full" style={{backgroundColor: 'hsl(var(--success))'}}/> <div><span className="font-bold">Acceptable:</span> Risk that is acceptable as is.</div></div>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="text-base">Definitions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div>
                        <h4 className="font-semibold">Severity</h4>
                        <p className="text-muted-foreground">The possible consequences of a hazard.</p>
                    </div>
                     <div>
                        <h4 className="font-semibold">Likelihood</h4>
                        <p className="text-muted-foreground">The probability or frequency of a hazard's effect.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </CardContent>
    </Card>
  );
}
