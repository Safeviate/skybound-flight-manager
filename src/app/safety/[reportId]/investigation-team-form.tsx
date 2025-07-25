
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
import type { SafetyReport, User } from '@/lib/types';
import { UserPlus, X, User as UserIcon } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, getDocs, query } from 'firebase/firestore';

const teamFormSchema = z.object({
  personnel: z.string().min(1, 'You must select a person to add.'),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

interface InvestigationTeamFormProps {
  report: SafetyReport;
  onUpdate: (updatedReport: SafetyReport, showToast?: boolean) => void;
}

export function InvestigationTeamForm({ report, onUpdate }: InvestigationTeamFormProps) {
  const { toast } = useToast();
  const { company } = useUser();
  const [team, setTeam] = React.useState<string[]>(() => {
    const initialTeam = new Set(report.investigationTeam || []);
    if (report.submittedBy !== 'Anonymous') {
      initialTeam.add(report.submittedBy);
    }
    return Array.from(initialTeam);
  });
  const [allPersonnel, setAllPersonnel] = React.useState<User[]>([]);

  React.useEffect(() => {
    const fetchPersonnel = async () => {
      if (!company) return;
      try {
        const personnelQuery = query(collection(db, `companies/${company.id}/users`));
        const snapshot = await getDocs(personnelQuery);
        setAllPersonnel(snapshot.docs.map(doc => doc.data() as User));
      } catch (error) {
        console.error("Error fetching personnel:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load personnel list.' });
      }
    };
    fetchPersonnel();
  }, [company, toast]);

  React.useEffect(() => {
      const currentTeam = new Set(report.investigationTeam || []);
      if (report.submittedBy !== 'Anonymous') {
        currentTeam.add(report.submittedBy);
      }
      setTeam(Array.from(currentTeam));
  }, [report.investigationTeam, report.submittedBy]);


  const availablePersonnel = allPersonnel.filter(
    (u) => u.role !== 'Student' && !team.includes(u.name)
  );

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
  });

  function onAddMember(data: TeamFormValues) {
    const newTeam = [...team, data.personnel];
    setTeam(newTeam);
    onUpdate({ ...report, investigationTeam: newTeam });
    form.reset();
    toast({
      title: 'Team Member Added',
      description: `${data.personnel} has been added to the investigation.`,
    });
  }

  function onRemoveMember(memberName: string) {
    if (memberName === report.submittedBy && report.submittedBy !== 'Anonymous') {
      toast({
        variant: 'destructive',
        title: 'Action Not Allowed',
        description: 'The original reporter cannot be removed from the investigation team.',
      });
      return;
    }
    const newTeam = team.filter((m) => m !== memberName);
    setTeam(newTeam);
    onUpdate({ ...report, investigationTeam: newTeam });
    toast({
      title: 'Team Member Removed',
      description: `${memberName} has been removed from the investigation.`,
    });
  }

  return (
    <div className="space-y-6 rounded-lg border p-4">
        <div>
            <h3 className="font-semibold text-lg">Investigation Team</h3>
            <p className="text-sm text-muted-foreground">Assign personnel to investigate this report.</p>
        </div>
      <div className="space-y-4">
        {team.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {team.map((memberName) => {
              const member = allPersonnel.find((u) => u.name === memberName);
              const isReporter = memberName === report.submittedBy;
              return (
                <div key={memberName} className="flex items-center gap-2 p-2 rounded-md border bg-muted">
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
