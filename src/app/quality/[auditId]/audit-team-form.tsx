
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { QualityAudit, User } from '@/lib/types';
import { UserPlus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const teamFormSchema = z.object({
  personnel: z.string().min(1, 'You must select a person to add.'),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

interface AuditTeamFormProps {
  audit: QualityAudit;
  personnel: User[];
  onUpdate: (updatedAudit: QualityAudit, showToast?: boolean) => void;
}

export function AuditTeamForm({ audit, personnel, onUpdate }: AuditTeamFormProps) {
  const { toast } = useToast();
  
  const auditorUser = personnel.find(p => p.name === audit.auditor);
  const auditeeUser = personnel.find(p => p.name === audit.auditeeName);
  const auditeePosition = auditeeUser?.role === 'Auditee' ? auditeeUser.externalPosition : auditeeUser?.role;

  const auditTeamUsers = audit.auditTeam || [];
  const auditeeTeamUsers = audit.auditeeTeam || [];

  return (
    <Card>
        <CardHeader>
            <CardTitle>Audit Team & Participants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-4">
                <h4 className="font-semibold text-muted-foreground">Audit Team</h4>
                <div className="flex flex-wrap gap-4">
                    <div className="p-4 border rounded-lg bg-muted/50 min-w-[200px]">
                        <p className="text-sm font-semibold text-primary">Lead Auditor</p>
                        <p className="text-lg font-bold">{audit.auditor}</p>
                        <p className="text-sm text-muted-foreground">{auditorUser?.role}</p>
                    </div>
                     {auditTeamUsers.filter(name => name !== audit.auditor).map((name, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-muted/50 min-w-[200px]">
                            <p className="text-sm font-semibold text-primary">Team Member</p>
                            <p className="text-lg font-bold">{name}</p>
                        </div>
                     ))}
                </div>
            </div>
            <Separator />
            <div className="space-y-4">
                <h4 className="font-semibold text-muted-foreground">Auditee Team</h4>
                <div className="flex flex-wrap gap-4">
                    <div className="p-4 border rounded-lg bg-muted/50 min-w-[200px]">
                        <p className="text-sm font-semibold text-primary">Primary Auditee</p>
                        <p className="text-lg font-bold">{audit.auditeeName}</p>
                        <p className="text-sm text-muted-foreground">{auditeePosition}</p>
                    </div>
                    {auditeeTeamUsers.filter(name => name !== audit.auditeeName).map((name, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-muted/50 min-w-[200px]">
                            <p className="text-sm font-semibold text-primary">Team Member</p>
                            <p className="text-lg font-bold">{name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
    </Card>
  );
}
