
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';

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

const INITIAL_CELL_COLORS: Record<string, string> = {
    '5A': '#d9534f', '5B': '#d9534f', '5C': '#f0ad4e', '5D': '#f0ad4e', '5E': '#5cb85c',
    '4A': '#d9534f', '4B': '#d9534f', '4C': '#f0ad4e', '4D': '#5cb85c', '4E': '#5cb85c',
    '3A': '#d9534f', '3B': '#f0ad4e', '3C': '#f0ad4e', '3D': '#5cb85c', '3E': '#5cb85c',
    '2A': '#f0ad4e', '2B': '#f0ad4e', '2C': '#5cb85c', '2D': '#5cb85c', '2E': '#5cb85c',
    '1A': '#5cb85c', '1B': '#5cb85c', '1C': '#5cb85c', '1D': '#5cb85c', '1E': '#5cb85c',
};

export function RiskAssessmentTool() {
  const [cellColors, setCellColors] = useState(INITIAL_CELL_COLORS);

  const handleColorChange = (riskCode: string, value: string) => {
    setCellColors(prev => ({ ...prev, [riskCode]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ICAO Risk Assessment Matrix</CardTitle>
        <CardDescription>
          This matrix is used to determine the level of risk associated with an identified hazard, based on ICAO Document 9859 (Safety Management Manual). Right-click a cell to change its color.
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
                                return (
                                <ContextMenu key={`${value}-${severityValue}`}>
                                    <ContextMenuTrigger asChild>
                                        <TableCell className="p-2 text-center cursor-context-menu" style={{ backgroundColor: cellColors[riskCode] }}>
                                            <div className="font-bold text-white">{riskCode}</div>
                                        </TableCell>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                        <ContextMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent">
                                             <div className="flex items-center gap-2">
                                                <Label htmlFor={`${riskCode}-color`} className="font-semibold">{riskCode}</Label>
                                                <Input 
                                                    id={`${riskCode}-color`}
                                                    type="color" 
                                                    value={cellColors[riskCode]} 
                                                    onChange={(e) => handleColorChange(riskCode, e.target.value)}
                                                    className="h-8 w-10 p-1"
                                                />
                                            </div>
                                        </ContextMenuItem>
                                    </ContextMenuContent>
                                </ContextMenu>
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
