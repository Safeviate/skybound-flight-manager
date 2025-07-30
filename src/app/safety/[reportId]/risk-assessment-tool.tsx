

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const LIKELIHOOD_LEVELS = {
    'Frequent': { description: 'Likely to occur many times (has happened frequently).', value: 5 },
    'Occasional': { description: 'Likely to occur some times (has happened infrequently).', value: 4 },
    'Remote': { description: 'Unlikely, but possible to occur (has happened rarely).', value: 3 },
    'Improbable': { description: 'Very unlikely to occur (not known to have happened).', value: 2 },
    'Extremely Improbable': { description: 'Almost inconceivable that the event will occur.', value: 1 },
};

const SEVERITY_LEVELS = {
    'Catastrophic': { description: 'Equipment destroyed, multiple deaths.', value: 'A' },
    'Hazardous': { description: 'Large reduction in safety margins, serious injury, major equipment damage.', value: 'B' },
    'Major': { description: 'Significant reduction in safety margins, serious incident, injury to persons.', value: 'C' },
    'Minor': { description: 'Nuisance, operating limitations, minor incident.', value: 'D' },
    'Negligible': { description: 'Little or no effect on safety.', value: 'E' },
};


const RISK_MATRIX_DATA: Record<string, Record<string, string>> = {
    '5': { 'A': '5A', 'B': '5B', 'C': '5C', 'D': '5D', 'E': '5E' },
    '4': { 'A': '4A', 'B': '4B', 'C': '4C', 'D': '4D', 'E': '4E' },
    '3': { 'A': '3A', 'B': '3B', 'C': '3C', 'D': '3D', 'E': '3E' },
    '2': { 'A': '2A', 'B': '2B', 'C': '2C', 'D': '2D', 'E': '2E' },
    '1': { 'A': '1A', 'B': '1B', 'C': '1C', 'D': '1D', 'E': '1E' },
};

const RISK_CLASSIFICATION: Record<string, 'Intolerable' | 'Tolerable' | 'Acceptable'> = {
    '5A': 'Intolerable', '5B': 'Intolerable', '5C': 'Tolerable',   '5D': 'Tolerable',   '5E': 'Acceptable',
    '4A': 'Intolerable', '4B': 'Intolerable', '4C': 'Tolerable',   '4D': 'Acceptable',  '4E': 'Acceptable',
    '3A': 'Intolerable', '3B': 'Tolerable',   '3C': 'Tolerable',   '3D': 'Acceptable',  '3E': 'Acceptable',
    '2A': 'Tolerable',   '2B': 'Tolerable',   '2C': 'Acceptable',  '2D': 'Acceptable',  '2E': 'Acceptable',
    '1A': 'Acceptable',  '1B': 'Acceptable',  '1C': 'Acceptable',  '1D': 'Acceptable',  '1E': 'Acceptable',
};


export function RiskAssessmentTool() {
  const [colors, setColors] = useState({
    Intolerable: '#d9534f', // Red
    Tolerable: '#f0ad4e',   // Orange
    Acceptable: '#5cb85c', // Green
  });

  const handleColorChange = (level: keyof typeof colors, value: string) => {
    setColors(prev => ({ ...prev, [level]: value }));
  };

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
                        <TableHead className="border-r align-bottom" rowSpan={2}>Likelihood</TableHead>
                        <TableHead className="text-center" colSpan={5}>Severity of Consequences</TableHead>
                    </TableRow>
                    <TableRow>
                        {Object.entries(SEVERITY_LEVELS).map(([level, { description, value }]) => (
                            <TableHead key={level} className="border-t text-center p-2">
                                <div>{level}</div>
                                <div className="text-xs font-normal text-muted-foreground">({value})</div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(LIKELIHOOD_LEVELS).reverse().map(([level, { description, value }]) => (
                        <TableRow key={level}>
                            <TableCell className="border-r p-2 font-semibold">
                                <div>{level}</div>
                                <div className="text-xs font-normal text-muted-foreground">({value})</div>
                            </TableCell>
                            {Object.values(SEVERITY_LEVELS).map(({ value: severityValue }) => {
                                const riskCode = RISK_MATRIX_DATA[value][severityValue];
                                const classification = RISK_CLASSIFICATION[riskCode];
                                return (
                                <TableCell key={`${value}-${severityValue}`} className="p-2 text-center" style={{ backgroundColor: colors[classification] }}>
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
                    <CardTitle className="text-base">Risk Tolerability &amp; Colors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    {Object.entries(colors).map(([level, color]) => (
                        <div key={level} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full" style={{backgroundColor: color}}/>
                                <span className="font-bold">{level}:</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <Label htmlFor={`${level}-color`} className="sr-only">{level} color</Label>
                                <Input 
                                    id={`${level}-color`}
                                    type="color" 
                                    value={color} 
                                    onChange={(e) => handleColorChange(level as keyof typeof colors, e.target.value)}
                                    className="h-8 w-10 p-1"
                                />
                                <Input 
                                    type="text"
                                    value={color}
                                    onChange={(e) => handleColorChange(level as keyof typeof colors, e.target.value)}
                                    className="h-8 w-24"
                                />
                            </div>
                        </div>
                    ))}
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

