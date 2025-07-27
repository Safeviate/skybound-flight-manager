
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
  const [team, setTeam] = React.useState<string[]>([]);

  React.useEffect(() => {
    const initialTeam = new Set(audit.investigationTeam || []);
    if (audit.auditor) initialTeam.add(audit.auditor);
    if (audit.auditeeName) initialTeam.add(audit.auditeeName);
    setTeam(Array.from(initialTeam));
  }, [audit.investigationTeam, audit.auditor, audit.auditeeName]);

  const availablePersonnel = personnel.filter(
    (u) => u.role !== 'Student' && !team.includes(u.name)
  );

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
  });

  function onAddMember(data: TeamFormValues) {
    const newTeam = [...team, data.personnel];
    setTeam(newTeam);
    onUpdate({ ...audit, investigationTeam: newTeam });
    form.reset();
    toast({
      title: 'Team Member Added',
      description: `${data.personnel} has been added to the investigation.`,
    });
  }

  function onRemoveMember(memberName: string) {
    if (memberName === audit.auditor || memberName === audit.auditeeName) {
      toast({
        variant: 'destructive',
        title: 'Action Not Allowed',
        description: 'The auditor or primary auditee cannot be removed.',
      });
      return;
    }
    const newTeam = team.filter((m) => m !== memberName);
    setTeam(newTeam);
    onUpdate({ ...audit, investigationTeam: newTeam });
    toast({
      title: 'Team Member Removed',
      description: `${memberName} has been removed from the investigation.`,
    });
  }
  
  const auditorUser = personnel.find(p => p.name === audit.auditor);
  const auditeeUser = personnel.find(p => p.name === audit.auditeeName);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
            <h4 className="font-semibold text-muted-foreground">Auditor</h4>
            <p className="text-lg font-bold">{audit.auditor}</p>
            <p className="text-sm text-muted-foreground">{auditorUser?.role}</p>
        </div>
         <div className="p-4 border rounded-lg">
            <h4 className="font-semibold text-muted-foreground">Auditee</h4>
            <p className="text-lg font-bold">{audit.auditeeName}</p>
             <p className="text-sm text-muted-foreground">{auditeeUser?.role}</p>
        </div>
      </div>
      
    </div>
  );
}
