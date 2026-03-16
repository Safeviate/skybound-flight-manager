'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import type { Risk, Company } from '@/lib/types';
import { DEFAULT_HAZARD_AREAS } from '@/lib/types';
import { getRiskScoreColor, getRiskLevel, getRiskAlphaCode } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewRiskForm } from './new-risk-form';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, addDoc, collection, updateDoc, deleteDoc } from 'firebase/firestore';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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

interface RiskRegisterProps {
  risks: Risk[];
  onUpdate: () => void;
}

const RiskTable = ({ 
    risks, 
    canEdit, 
    openEditDialog, 
    handleDeleteRisk, 
    company 
}: { 
    risks: Risk[], 
    canEdit: boolean, 
    openEditDialog: (risk: Risk) => void, 
    handleDeleteRisk: (id: string) => void, 
    company: Company | null 
}) => (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[30%]">Hazard</TableHead>
                <TableHead className="w-[30%]">Risk</TableHead>
                <TableHead>Initial</TableHead>
                <TableHead>Mitigated</TableHead>
                <TableHead>Level</TableHead>
                {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {risks.length > 0 ? (
                    risks.map(risk => {
                        const initialCode = getRiskAlphaCode(risk.likelihood, risk.severity);
                        const mitigatedCode = getRiskAlphaCode(risk.residualLikelihood || undefined, risk.residualSeverity || undefined);
                        const displayLevelScore = risk.residualRiskScore !== undefined ? risk.residualRiskScore : risk.riskScore;

                        return (
                            <TableRow key={risk.id}>
                                <TableCell className="font-medium whitespace-normal">{risk.hazard}</TableCell>
                                <TableCell className="whitespace-normal">{risk.risk}</TableCell>
                                <TableCell>
                                    {initialCode && (
                                        <Badge 
                                            className="text-black font-bold"
                                            style={{ backgroundColor: getRiskScoreColor(risk.likelihood, risk.severity, company?.riskMatrixColors) }}
                                        >
                                            {initialCode}
                                        </Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {mitigatedCode ? (
                                        <Badge 
                                            className="text-black font-bold"
                                            style={{ backgroundColor: getRiskScoreColor(risk.residualLikelihood || undefined, risk.residualSeverity || undefined, company?.riskMatrixColors) }}
                                        >
                                            {mitigatedCode}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">N/A</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">{getRiskLevel(displayLevelScore)}</Badge>
                                </TableCell>
                                {canEdit && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(risk)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the hazard "{risk.hazard}" from the register. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteRisk(risk.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        )
                    })
                ) : (
                    <TableRow>
                        <TableCell colSpan={canEdit ? 6 : 5} className="h-24 text-center">
                            No open risks in this area.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
    </ScrollArea>
);

export function RiskRegister({ risks, onUpdate }: RiskRegisterProps) {
  const [isNewRiskOpen, setIsNewRiskOpen] = React.useState(false);
  const [editingRisk, setEditingRisk] = React.useState<Risk | null>(null);
  const { user, company } = useUser();
  const { toast } = useToast();

  const handleRiskSubmit = async (data: Omit<Risk, 'id' | 'companyId'>) => {
    if (!company) return;

    const cleanData = JSON.parse(JSON.stringify(data));

    try {
        if (editingRisk) {
            const riskRef = doc(db, `companies/${company.id}/risks`, editingRisk.id);
            await updateDoc(riskRef, cleanData);
            toast({ title: "Risk Updated", description: "The risk details have been saved." });
        } else {
            const risksCollection = collection(db, `companies/${company.id}/risks`);
            await addDoc(risksCollection, { ...cleanData, companyId: company.id });
            toast({ title: "Risk Added", description: "The new risk has been added to the register." });
        }
        onUpdate();
        setIsNewRiskOpen(false);
        setEditingRisk(null);
    } catch (error) {
        console.error("Error submitting risk:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save the risk." });
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    if (!company) return;
    try {
        await deleteDoc(doc(db, `companies/${company.id}/risks`, riskId));
        toast({ title: "Risk Deleted", description: "The hazard has been removed from the register." });
        onUpdate();
    } catch (error) {
        console.error("Error deleting risk:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete the risk." });
    }
  };
  
  const openEditDialog = (risk: Risk) => {
    setEditingRisk(risk);
    setIsNewRiskOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingRisk(null);
    setIsNewRiskOpen(true);
  };
  
  const canEdit = user?.permissions.includes('Safety:Edit') || user?.permissions.includes('Super User');

  const hazardAreas = company?.hazardAreas && company.hazardAreas.length > 0 
    ? company.hazardAreas 
    : DEFAULT_HAZARD_AREAS;

  const uncategorizedRisks = risks.filter(r => !hazardAreas.includes(r.hazardArea) && r.status !== 'Closed');

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-start">
        <div>
          <CardTitle>Organizational Risk Register</CardTitle>
          <CardDescription>A live register of all identified organizational risks, grouped by hazard area.</CardDescription>
        </div>
        <div className="flex gap-2">
            {canEdit && (
                <>
                    <Button variant="outline" asChild size="sm">
                        <Link href="/settings/company">
                            <Edit className="mr-2 h-4 w-4" />
                            Manage Headings
                        </Link>
                    </Button>
                    <Dialog open={isNewRiskOpen} onOpenChange={(isOpen) => { if (!isOpen) setEditingRisk(null); setIsNewRiskOpen(isOpen); }}>
                        <DialogTrigger asChild>
                            <Button onClick={openNewDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" /> New Risk
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>{editingRisk ? 'Edit Risk' : 'Add New Risk'}</DialogTitle>
                                <DialogDescription>
                                    {editingRisk ? 'Update the details for this risk.' : 'Manually add a new risk to the central register.'}
                                </DialogDescription>
                            </DialogHeader>
                            <NewRiskForm onSubmit={handleRiskSubmit} existingRisk={editingRisk} />
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={hazardAreas[0]}>
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList>
                {hazardAreas.map(area => <TabsTrigger key={area} value={area}>{area}</TabsTrigger>)}
                {uncategorizedRisks.length > 0 && <TabsTrigger value="Uncategorized">Uncategorized</TabsTrigger>}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
            {hazardAreas.map(area => {
                const areaRisks = risks.filter(r => r.hazardArea === area && r.status !== 'Closed');
                return (
                    <TabsContent key={area} value={area}>
                         <RiskTable 
                            risks={areaRisks} 
                            canEdit={canEdit} 
                            openEditDialog={openEditDialog} 
                            handleDeleteRisk={handleDeleteRisk} 
                            company={company} 
                        />
                    </TabsContent>
                )
            })}
            {uncategorizedRisks.length > 0 && (
                <TabsContent value="Uncategorized">
                    <div className="p-2 mb-2 bg-muted rounded-md text-xs text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3" />
                        These risks are assigned to hazard areas that have been removed from your company settings.
                    </div>
                    <RiskTable 
                        risks={uncategorizedRisks} 
                        canEdit={canEdit} 
                        openEditDialog={openEditDialog} 
                        handleDeleteRisk={handleDeleteRisk} 
                        company={company} 
                    />
                </TabsContent>
            )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
