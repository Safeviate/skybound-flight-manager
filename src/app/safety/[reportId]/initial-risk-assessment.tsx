
'use client';

import React, { useState, Fragment } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { getRiskScore, getRiskScoreColor, getRiskLevel, getRiskAlphaCode } from '@/lib/utils.tsx';
import type { AssociatedRisk, SafetyReport, Risk as RiskRegisterEntry, RiskLikelihood, RiskSeverity } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, ArrowUpCircle, Edit, Save, Trash2 } from 'lucide-react';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddRiskForm } from './add-risk-form';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RiskAssessmentTool } from './risk-assessment-tool';
import { z } from 'zod';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/context/user-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InitialRiskAssessmentProps {
    report: SafetyReport;
    onUpdate: (updatedReport: SafetyReport) => void;
    onPromoteRisk: (newRisk: RiskRegisterEntry) => void;
}

export function InitialRiskAssessment({ report, onUpdate, onPromoteRisk }: InitialRiskAssessmentProps) {
  const [isAddRiskOpen, setIsAddRiskOpen] = useState(false);
  const { company } = useUser();
  const { toast } = useToast();

  const handleAddRisk = (newRiskData: Omit<AssociatedRisk, 'id'>) => {
    const riskScore = getRiskScore(newRiskData.likelihood, newRiskData.severity);
    const newRisk: AssociatedRisk = {
        ...newRiskData,
        id: `risk-${Date.now()}`,
        riskScore,
    };
    
    const updatedRisks = [...(report.associatedRisks || []), newRisk];
    onUpdate({ ...report, associatedRisks: updatedRisks });
    
    setIsAddRiskOpen(false);
    toast({
        title: 'Hazard Added',
        description: 'The new hazard and its initial risk score have been recorded.'
    });
  }

  const handleDeleteRisk = (riskId: string) => {
    const updatedRisks = report.associatedRisks?.filter(r => r.id !== riskId) || [];
    onUpdate({ ...report, associatedRisks: updatedRisks });
    toast({
        title: 'Hazard Removed',
        description: 'The hazard has been removed from this report.'
    });
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
        <div className="flex flex-row items-start justify-between gap-4">
            <div className="flex-1">
                <h3 className="font-semibold text-lg">Initial Risk Assessment</h3>
                <p className="text-sm text-muted-foreground">
                    Identify hazards associated with this report and assess their initial risk level.
                </p>
            </div>
            <div className="flex flex-col items-end gap-2 w-52">
                <Dialog open={isAddRiskOpen} onOpenChange={setIsAddRiskOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Hazard
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add New Hazard & Risk</DialogTitle>
                            <DialogDescription>
                                Describe the hazard, the potential risk, and use the matrix to set an initial score.
                            </DialogDescription>
                        </DialogHeader>
                        <AddRiskForm onAddRisk={handleAddRisk} />
                    </DialogContent>
                </Dialog>
            </div>
        </div>

        {report.associatedRisks && report.associatedRisks.length > 0 ? (
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Hazard</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {report.associatedRisks.map(risk => {
                        const alphaCode = getRiskAlphaCode(risk.likelihood, risk.severity);
                        return (
                            <TableRow key={risk.id}>
                                <TableCell className="max-w-xs">{risk.hazard}</TableCell>
                                <TableCell className="max-w-xs">{risk.risk}</TableCell>
                                <TableCell>
                                    {alphaCode ? (
                                        <Badge 
                                            className="text-black font-bold"
                                            style={{ backgroundColor: getRiskScoreColor(risk.likelihood, risk.severity, company?.riskMatrixColors) }}
                                        >
                                            {alphaCode}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">N/A</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{getRiskLevel(risk.riskScore)}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Remove Hazard?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will remove the hazard "{risk.hazard}" from this safety report.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDeleteRisk(risk.id)}>Remove</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
                </Table>
        ) : (
            <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No hazards or risks have been added yet.</p>
            </div>
        )}
    </div>
  );
}
