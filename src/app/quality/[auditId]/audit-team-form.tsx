
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

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {team.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {team.map((memberName) => {
              const member = personnel.find((u) => u.name === memberName);
              const isAuditor = memberName === audit.auditor;
              const isAuditee = memberName === audit.auditeeName;
              
              let role = member?.role;
              if (isAuditor) role = "Auditor";
              if (isAuditee) role = "Auditee";
              
              return (
                <div key={memberName} className="flex items-center gap-2 p-2 rounded-md border bg-muted">
                  <div>
                    <p className="font-medium text-sm">{memberName}</p>
                    <p className="text-xs text-muted-foreground">{role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => onRemoveMember(memberName)}
                    disabled={isAuditor || isAuditee}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No personnel assigned yet.</p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onAddMember)} className="flex items-end gap-2">
          <FormField
            control={form.control}
            name="personnel"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="sr-only">Add Team Member</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select personnel to add" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availablePersonnel.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name} ({p.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit">
            <UserPlus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </form>
      </Form>
    </div>
  );
}
