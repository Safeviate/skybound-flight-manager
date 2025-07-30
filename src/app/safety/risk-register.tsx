
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import type { Risk } from '@/lib/types';
import { getRiskScoreColor, getRiskLevel } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Edit, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NewRiskForm } from './new-risk-form';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, addDoc, collection, updateDoc, deleteDoc } from 'firebase/firestore';


const HAZARD_AREAS = [
    'Flight Operations', 
    'Ground Operations',
    'Maintenance', 
    'Cabin Safety', 
    'Occupational Safety', 
    'Security', 
    'Administration & Management'
];

interface RiskRegisterProps {
  risks: Risk[];
  onUpdate: () => void;
}

export function RiskRegister({ risks, onUpdate }: RiskRegisterProps) {
  const [isNewRiskOpen, setIsNewRiskOpen] = React.useState(false);
  const [editingRisk, setEditingRisk] = React.useState<Risk | null>(null);
  const { user, company } = useUser();
  const { toast } = useToast();

  const handleRiskSubmit = async (data: Omit<Risk, 'id' | 'companyId'>) => {
    if (!company) return;

    try {
        if (editingRisk) {
            const riskRef = doc(db, `companies/${company.id}/risks`, editingRisk.id);
            await updateDoc(riskRef, data as any);
            toast({ title: "Risk Updated", description: "The risk details have been saved." });
        } else {
            await addDoc(collection(db, `companies/${company.id}/risks`), { ...data, companyId: company.id });
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
  
  const openEditDialog = (risk: Risk) => {
    setEditingRisk(risk);
    setIsNewRiskOpen(true);
  };
  
  const openNewDialog = () => {
    setEditingRisk(null);
    setIsNewRiskOpen(true);
  };
  
  const canEdit = user?.permissions.includes('Safety:Edit') || user?.permissions.includes('Super User');

  return (
    <Card>
      <CardHeader className="flex-row justify-between items-start">
        <div>
          <CardTitle>Organizational Risk Register</CardTitle>
          <CardDescription>A live register of all identified organizational risks, grouped by hazard area.</CardDescription>
        </div>
        {canEdit && (
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
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={HAZARD_AREAS[0]}>
            <TabsList>
                {HAZARD_AREAS.map(area => <TabsTrigger key={area} value={area}>{area}</TabsTrigger>)}
            </TabsList>
            {HAZARD_AREAS.map(area => {
                const areaRisks = risks.filter(r => r.hazardArea === area && r.status === 'Open');
                return (
                    <TabsContent key={area} value={area}>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead className="w-1/4">Hazard</TableHead>
                                <TableHead className="w-1/4">Risk</TableHead>
                                <TableHead>Initial Score</TableHead>
                                <TableHead>Mitigated Score</TableHead>
                                <TableHead>Level</TableHead>
                                {canEdit && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {areaRisks.length > 0 ? (
                                    areaRisks.map(risk => (
                                        <TableRow key={risk.id}>
                                            <TableCell className="font-medium">{risk.hazard}</TableCell>
                                            <TableCell>{risk.risk}</TableCell>
                                            <TableCell>
                                                <Badge style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>
                                                    {risk.riskScore}
                                                </Badge>
                                            </TableCell>
                                             <TableCell>
                                                {risk.residualRiskScore !== undefined ? (
                                                    <Badge style={{ backgroundColor: getRiskScoreColor(risk.residualRiskScore), color: 'white' }}>
                                                        {risk.residualRiskScore}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">N/A</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{getRiskLevel(risk.residualRiskScore ?? risk.riskScore)}</Badge>
                                            </TableCell>
                                            {canEdit && (
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => openEditDialog(risk)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={canEdit ? 6 : 5} className="h-24 text-center">
                                            No open risks in this area.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                         </Table>
                    </TabsContent>
                )
            })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
