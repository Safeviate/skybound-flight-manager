
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { userData } from '@/lib/mock-data';
import type { SafetyReport } from '@/lib/types';
import { UserPlus, X, User as UserIcon } from 'lucide-react';

const teamFormSchema = z.object({
  personnel: z.string().min(1, 'You must select a person to add.'),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

interface InvestigationTeamFormProps {
  report: SafetyReport;
}

export function InvestigationTeamForm({ report }: InvestigationTeamFormProps) {
  const { toast } = useToast();
  const [team, setTeam] = React.useState<string[]>(() => {
    const initialTeam = new Set(report.investigationTeam || []);
    if (report.submittedBy !== 'Anonymous') {
        initialTeam.add(report.submittedBy);
    }
    return Array.from(initialTeam);
  });

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
  });

  const availablePersonnel = userData.filter(
    (u) => u.role !== 'Student' && !team.includes(u.name)
  );

  function onAddMember(data: TeamFormValues) {
    setTeam((prevTeam) => [...prevTeam, data.personnel]);
    form.reset();
    toast({
      title: 'Team Member Added',
      description: `${data.personnel} has been added to the investigation.`,
    });
  }

  function onRemoveMember(memberName: string) {
    // Prevent the original reporter from being removed
    if (memberName === report.submittedBy && report.submittedBy !== 'Anonymous') {
      toast({
        variant: 'destructive',
        title: 'Action Not Allowed',
        description: 'The original reporter cannot be removed from the investigation team.',
      });
      return;
    }
    setTeam((prevTeam) => prevTeam.filter((m) => m !== memberName));
    toast({
      title: 'Team Member Removed',
      description: `${memberName} has been removed from the investigation.`,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-semibold mb-2">Current Investigation Team</h4>
        {team.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {team.map((memberName) => {
              const member = userData.find((u) => u.name === memberName);
              const isReporter = memberName === report.submittedBy;
              return (
                <div key={memberName} className="flex items-center gap-2 p-2 rounded-md border bg-muted">
                   <div className="h-8 w-8 flex-shrink-0 bg-secondary rounded-full flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-muted-foreground" />
                   </div>
                  <div>
                    <p className="font-medium text-sm">{memberName}</p>
                    <p className="text-xs text-muted-foreground">{isReporter ? 'Reporter' : member?.role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => onRemoveMember(memberName)}
                    disabled={isReporter && report.submittedBy !== 'Anonymous'}
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
                <FormLabel>Add Team Member</FormLabel>
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
