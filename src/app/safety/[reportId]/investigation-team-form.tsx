
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
import type { SafetyReport, User, Alert, InvestigationTeamMember } from '@/lib/types';
import { UserPlus, X } from 'lucide-react';
import { useUser } from '@/context/user-provider';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, addDoc } from 'firebase/firestore';

const INVESTIGATION_ROLES: InvestigationTeamMember['role'][] = [
  'Lead Investigator',
  'Investigator',
  'Technical Expert',
  'Observer',
];

const teamFormSchema = z.object({
  userId: z.string().min(1, 'You must select a person to add.'),
  role: z.enum(INVESTIGATION_ROLES, { required_error: 'You must assign a role.'}),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

interface InvestigationTeamFormProps {
  report: SafetyReport;
  onUpdate: (updatedReport: SafetyReport, showToast?: boolean) => void;
}

export function InvestigationTeamForm({ report, onUpdate }: InvestigationTeamFormProps) {
  const { toast } = useToast();
  const { user: currentUser, company } = useUser();
  const [team, setTeam] = React.useState<InvestigationTeamMember[]>(report.investigationTeam || []);
  const [allPersonnel, setAllPersonnel] = React.useState<User[]>([]);

  React.useEffect(() => {
    const fetchPersonnel = async () => {
      if (!company) return;
      try {
        const personnelQuery = query(collection(db, `companies/${company.id}/users`));
        const snapshot = await getDocs(personnelQuery);
        setAllPersonnel(snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as User)));
      } catch (error) {
        console.error("Error fetching personnel:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load personnel list.' });
      }
    };
    fetchPersonnel();
  }, [company, toast]);

  React.useEffect(() => {
    setTeam(report.investigationTeam || []);
  }, [report.investigationTeam]);

  const teamMemberIds = React.useMemo(() => new Set(team.map(m => m.userId)), [team]);

  const availablePersonnel = allPersonnel.filter(
    (u) => u.role !== 'Student' && !teamMemberIds.has(u.id)
  );

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
  });

  async function onAddMember(data: TeamFormValues) {
    if (!company || !currentUser) return;
    
    const addedUser = allPersonnel.find(p => p.id === data.userId);
    if (!addedUser) return;

    const newMember: InvestigationTeamMember = {
        userId: addedUser.id,
        name: addedUser.name,
        role: data.role,
    };

    const newTeam = [...team, newMember];
    setTeam(newTeam);
    onUpdate({ ...report, investigationTeam: newTeam });
    form.reset();

    if (addedUser) {
        const newAlert: Omit<Alert, 'id' | 'number'> = {
            companyId: company.id,
            type: 'Task',
            title: `Assigned to Investigation: ${report.reportNumber}`,
            description: `You have been added as a ${data.role} to the investigation for safety report: "${report.heading}".`,
            author: currentUser.name,
            date: new Date().toISOString(),
            readBy: [],
            targetUserId: addedUser.id,
            relatedLink: `/safety/${report.id}`,
        };
        const alertsCollection = collection(db, `companies/${company.id}/alerts`);
        await addDoc(alertsCollection, newAlert);
    }
    
    toast({
      title: 'Team Member Added',
      description: `${addedUser.name} has been added to the investigation and notified.`,
    });
  }

  function onRemoveMember(memberId: string) {
    // Note: The original reporter cannot be removed as they are not part of this specific list.
    const newTeam = team.filter((m) => m.userId !== memberId);
    const removedMember = team.find(m => m.userId === memberId);
    setTeam(newTeam);
    onUpdate({ ...report, investigationTeam: newTeam });
    toast({
      title: 'Team Member Removed',
      description: `${removedMember?.name} has been removed from the investigation.`,
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {team.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {team.map((member, index) => {
              return (
                <div key={`${member.userId}-${index}`} className="flex items-center gap-2 p-2 rounded-md border bg-muted">
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2"
                    onClick={() => onRemoveMember(member.userId)}
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
            name="userId"
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
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="w-48">
                <FormLabel className="sr-only">Assign Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {INVESTIGATION_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
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
