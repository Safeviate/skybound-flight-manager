
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRiskScore, getRiskScoreColor } from '@/lib/utils.tsx';
import type { Risk, RiskLikelihood, RiskSeverity } from '@/lib/types';
import { cn } from '@/lib/utils.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const likelihoods: RiskLikelihood[] = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Certain'];
const severities: RiskSeverity[] = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

interface RiskMatrixProps {
  risks: Risk[];
}

export function RiskMatrix({ risks }: RiskMatrixProps) {
  const openRisks = risks.filter(r => r.status === 'Open');

  const riskMap = React.useMemo(() => {
    const map = new Map<string, Risk[]>();
    for (const risk of openRisks) {
      const key = `${risk.likelihood}-${risk.severity}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(risk);
    }
    return map;
  }, [openRisks]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizational Risk Matrix</CardTitle>
        <CardDescription>
          This matrix provides a visual overview of all open risks in the register, plotted by likelihood and severity. Numbers indicate the count of risks in each category.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 md:p-2">
        <div className="overflow-x-auto">
          <Table className="border min-w-[600px]">
            <TableHeader>
              <TableRow>
                <TableHead className="border-r font-bold p-1 h-10 align-bottom w-[120px]">
                    <div className="flex items-end justify-between h-full">
                        <span className="text-muted-foreground -rotate-90 origin-bottom-left -translate-y-4 translate-x-2 absolute bottom-full left-1/2">Likelihood</span>
                        <span className="text-muted-foreground ml-auto">Severity</span>
                    </div>
                </TableHead>
                {severities.map(s => <TableHead key={s} className="text-center p-1 h-20 w-20 font-semibold">{s}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {likelihoods.slice().reverse().map(l => (
                <TableRow key={l}>
                  <TableCell className="font-semibold border-r p-1 h-20 w-20">{l}</TableCell>
                  {severities.map(s => {
                    const score = getRiskScore(l, s);
                    const cellRisks = riskMap.get(`${l}-${s}`) || [];
                    const riskCount = cellRisks.length;
                    const cellColor = getRiskScoreColor(score, 0.4);

                    const CellContent = (
                        <div
                            className={cn(
                              'flex items-center justify-center w-full h-full text-2xl font-bold',
                              riskCount > 0 ? 'cursor-pointer hover:ring-2 hover:ring-primary ring-inset' : 'cursor-default'
                            )}
                            style={{ backgroundColor: cellColor }}
                        >
                            {riskCount > 0 && riskCount}
                        </div>
                    );

                    return (
                      <TableCell key={s} className="text-center p-0 border-l h-20 w-20">
                        {riskCount > 0 ? (
                           <Popover>
                                <PopoverTrigger asChild>{CellContent}</PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Risks: {l} / {s}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {riskCount} open risk(s) in this category.
                                        </p>
                                        <div className="grid gap-2">
                                            {cellRisks.map(risk => (
                                                <div key={risk.id} className="text-sm">
                                                    {risk.reportNumber ? (
                                                        <Link href={`/safety/${risk.reportNumber.replace(/[^a-zA-Z0-9-]/g, '')}`}>
                                                            <Badge variant="secondary" className="hover:underline">{risk.reportNumber}</Badge>
                                                        </Link>
                                                    ) : (
                                                        <Badge variant="secondary">Manual</Badge>
                                                    )}
                                                    <p className="font-semibold mt-1">{risk.hazard}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        ) : (
                            CellContent
                        )}
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
  );
}
