
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';
import { useUser } from '@/context/user-provider';
import type { RiskLikelihood, RiskSeverity } from '@/lib/types';


const LIKELIHOOD_LEVELS: Record<RiskLikelihood, { description: string; value: number }> = {
    'Frequent': { description: 'Likely to occur many times (has happened frequently).', value: 5 },
    'Occasional': { description: 'Likely to occur some times (has happened infrequently).', value: 4 },
    'Remote': { description: 'Unlikely, but possible to occur (has happened rarely).', value: 3 },
    'Improbable': { description: 'Very unlikely to occur (not known to have happened).', value: 2 },
    'Extremely Improbable': { description: 'Almost inconceivable that the event will occur.', value: 1 },
};

const LIKELIHOOD_ORDER: RiskLikelihood[] = ['Frequent', 'Occasional', 'Remote', 'Improbable', 'Extremely Improbable'];


const SEVERITY_LEVELS: Record<RiskSeverity, { description: string; value: string }> = {
    'Catastrophic': { description: 'Equipment destroyed, multiple deaths.', value: 'A' },
    'Hazardous': { description: 'Large reduction in safety margins, serious injury, major equipment damage.', value: 'B' },
    'Major': { description: 'Significant reduction in safety margins, serious incident, injury to persons.', value: 'C' },
    'Minor': { description: 'Nuisance, operating limitations, minor incident.', value: 'D' },
    'Negligible': { description: 'Little or no effect on safety.', value: 'E' },
};
const SEVERITY_ORDER: RiskSeverity[] = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];


const RISK_MATRIX_DATA: Record<string, Record<string, string>> = {
    '5': { 'A': '5A', 'B': '5B', 'C': '5C', 'D': '5D', 'E': '5E' },
    '4': { 'A': '4A', 'B': '4B', 'C': '4C', 'D': '4D', 'E': '4E' },
    '3': { 'A': '3A', 'B': '3B', 'C': '3C', 'D': '3D', 'E': '3E' },
    '2': { 'A': '2A', 'B': '2B', 'C': '2C', 'D': '2D', 'E': '2E' },
    '1': { 'A': '1A', 'B': '1B', 'C': '1C', 'D': '1D', 'E': '1E' },
};

const RISK_CLASSIFICATION: Record<string, string> = {
    '5A': 'Intolerable', '5B': 'Intolerable', '4A': 'Intolerable', '4B': 'Intolerable', '3A': 'Intolerable',
    '5C': 'Tolerable', '5D': 'Tolerable', '4C': 'Tolerable', '3B': 'Tolerable', '3C': 'Tolerable', '2A': 'Tolerable', '2B': 'Tolerable',
    '5E': 'Acceptable', '4D': 'Acceptable', '4E': 'Acceptable', '3D': 'Acceptable', '3E': 'Acceptable', '2C': 'Acceptable', '2D': 'Acceptable', '2E': 'Acceptable', '1A': 'Acceptable', '1B': 'Acceptable', '1C': 'Acceptable', '1D': 'Acceptable', '1E': 'Acceptable',
};


const INITIAL_CELL_COLORS: Record<string, string> = {
    '5A': '#d9534f', '5B': '#d9534f', '4A': '#d9534f', '4B': '#d9534f', '3A': '#d9534f',
    '5C': '#f0ad4e', '5D': '#f0ad4e', '4C': '#f0ad4e', '3B': '#f0ad4e', '3C': '#f0ad4e', '2A': '#f0ad4e', '2B': '#f0ad4e',
    '5E': '#5cb85c', '4D': '#5cb85c', '4E': '#5cb85c', '3D': '#5cb85c', '3E': '#5cb85c', '2C': '#5cb85c', '2D': '#5cb85c', '2E': '#5cb85c', '1A': '#5cb85c', '1B': '#5cb85c', '1C': '#5cb85c', '1D': '#5cb85c', '1E': '#5cb85c',
};

interface RiskAssessmentToolProps {
  onCellClick?: (likelihood: RiskLikelihood, severity: RiskSeverity) => void;
  selectedCode?: string | null;
}

export function RiskAssessmentTool({ onCellClick, selectedCode }: RiskAssessmentToolProps) {
  const [cellColors, setCellColors] = React.useState(INITIAL_CELL_COLORS);
  const { user } = useUser();
  const canEditColors = user?.permissions.includes('Super User') || user?.permissions.includes('Safety:Edit');

  const handleColorChange = (riskCode: string, value: string) => {
    setCellColors(prev => ({ ...prev, [riskCode]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ICAO Risk Assessment Matrix</CardTitle>
        <CardDescription>
          This matrix is used to determine the level of risk associated with an identified hazard, based on ICAO Document 9859 (Safety Management Manual). Click a cell to set values, or right-click to change the color.
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
                        {SEVERITY_ORDER.map((level) => (
                            <TableHead key={level} className="border-t text-center p-2">
                                <div>{level}</div>
                                <div className="text-xs font-normal text-muted-foreground">({SEVERITY_LEVELS[level].value})</div>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {LIKELIHOOD_ORDER.map((likelihood) => {
                        const { value: likelihoodValue } = LIKELIHOOD_LEVELS[likelihood];
                        return (
                        <TableRow key={likelihood}>
                            <TableCell className="border-r p-2 font-semibold">
                                <div>{likelihood}</div>
                                <div className="text-xs font-normal text-muted-foreground">({likelihoodValue})</div>
                            </TableCell>
                            {SEVERITY_ORDER.map((severity) => {
                                const { value: severityValue } = SEVERITY_LEVELS[severity];
                                const riskCode = RISK_MATRIX_DATA[likelihoodValue][severityValue];
                                const isSelected = selectedCode === riskCode;
                                return (
                                <ContextMenu key={`${likelihoodValue}-${severityValue}`}>
                                    <ContextMenuTrigger asChild>
                                        <TableCell 
                                            className={cn("p-2 text-center cursor-pointer transition-all", isSelected && 'ring-2 ring-primary ring-offset-2 z-10')} 
                                            style={{ backgroundColor: cellColors[riskCode] }}
                                            onClick={() => onCellClick?.(likelihood, severity)}
                                        >
                                            <div className="font-bold text-white">{riskCode}</div>
                                        </TableCell>
                                    </ContextMenuTrigger>
                                     {canEditColors && (
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
                                     )}
                                </ContextMenu>
                                );
                            })}
                        </TableRow>
                    )})}
                </TableBody>
            </Table>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-lg border">
                <h4 className="font-semibold mb-2">Severity</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                    {SEVERITY_ORDER.map((level) => {
                        const { value, description } = SEVERITY_LEVELS[level];
                        return <p key={level}><span className="font-bold text-foreground">({value}) {level}:</span> {description}</p>
                    })}
                </div>
            </div>
            <div className="p-4 rounded-lg border">
                <h4 className="font-semibold mb-2">Likelihood</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                     {LIKELIHOOD_ORDER.map((level) => {
                        const { value, description } = LIKELIHOOD_LEVELS[level];
                        return <p key={level}><span className="font-bold text-foreground">({value}) {level}:</span> {description}</p>
                    })}
                </div>
            </div>
        </div>
        {canEditColors && (
            <div className="mt-6 p-4 rounded-lg border">
                <CardHeader className="p-0 mb-4">
                  <CardTitle>Risk Color Customization</CardTitle>
                  <CardDescription>Set the background color for each risk index.</CardDescription>
                </CardHeader>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(
                      Object.entries(cellColors).reduce((acc, [code, color]) => {
                          const level = RISK_CLASSIFICATION[code];
                          if (!acc[level]) {
                              acc[level] = [];
                          }
                          acc[level].push({ code, color });
                          return acc;
                      }, {} as Record<string, { code: string; color: string }[]>)
                  ).map(([level, items]) => (
                      <div key={level} className="space-y-2">
                          <h4 className="font-semibold text-sm">{level}</h4>
                          <div className="space-y-2">
                              {items.map(({ code, color }) => (
                                  <div key={code} className="flex items-center gap-2">
                                      <Label htmlFor={`${code}-color-picker`} className="w-12">{code}</Label>
                                      <Input
                                          id={`${code}-color-picker`}
                                          type="color"
                                          value={color}
                                          onChange={(e) => handleColorChange(code, e.target.value)}
                                          className="h-8 w-10 p-1"
                                      />
                                      <Input 
                                          value={color}
                                          onChange={(e) => handleColorChange(code, e.target.value)}
                                          className="h-8 flex-1"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                  ))}
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
