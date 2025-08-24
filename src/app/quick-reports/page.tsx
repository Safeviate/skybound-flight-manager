
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/context/user-provider';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, addDoc, getCountFromServer } from 'firebase/firestore';
import type { Aircraft, TechnicalReport } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

const technicalReportSchema = z.object({
  aircraftRegistration: z.string().min(1, 'Please select an aircraft.'),
  component: z.string().min(1, 'Please select a component.'),
  description: z.string().min(10, 'A detailed description is required.'),
});

type TechnicalReportFormValues = z.infer<typeof technicalReportSchema>;

const componentOptions = [
    "Airframe",
    "Powerplant",
    "Propeller",
    "Landing Gear",
    "Avionics/Instruments",
    "Flight Controls",
    "Brakes/Wheels",
    "Fuel System",
    "Electrical System",
    "Interior/Cabin",
    "Other",
];


function QuickReportsPage() {
  const { user, company } = useUser();
  const { toast } = useToast();
  const [aircraftList, setAircraftList] = React.useState<Aircraft[]>([]);

  const form = useForm<TechnicalReportFormValues>({
    resolver: zodResolver(technicalReportSchema),
    defaultValues: {
      aircraftRegistration: '',
      component: '',
      description: '',
    },
  });

  React.useEffect(() => {
    if (!company) return;
    const fetchAircraft = async () => {
      const aircraftQuery = query(collection(db, `companies/${company.id}/aircraft`));
      const snapshot = await getDocs(aircraftQuery);
      setAircraftList(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Aircraft)));
    };
    fetchAircraft();
  }, [company]);

  const handleFormSubmit = async (data: TechnicalReportFormValues) => {
    if (!user || !company) return;
    try {
      const techReportsCollection = collection(db, `companies/${company.id}/technical-reports`);
      const snapshot = await getCountFromServer(techReportsCollection);
      const nextId = snapshot.data().count + 1;
      const reportNumber = `TECH-${String(nextId).padStart(4, '0')}`;

      const newReport: Omit<TechnicalReport, 'id'> = {
        companyId: company.id,
        reportNumber,
        ...data,
        reportedBy: user.name,
        dateReported: format(new Date(), 'yyyy-MM-dd'),
      };
      await addDoc(techReportsCollection, newReport);
      toast({
        title: 'Technical Report Submitted',
        description: `Report ${reportNumber} has been successfully filed.`,
      });
      form.reset();
    } catch (error) {
      console.error('Error submitting technical report:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit the report.' });
    }
  };

  return (
    <main className="flex-1 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Quick Technical Report</CardTitle>
            <CardDescription>
              Use this form to quickly report a technical issue with an aircraft component.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="aircraftRegistration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aircraft Registration</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select aircraft..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {aircraftList.map(ac => (
                            <SelectItem key={ac.id} value={ac.tailNumber}>{ac.tailNumber} ({ac.make} {ac.model})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="component"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Component</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select component..." /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {componentOptions.map(comp => (
                            <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description of Issue</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide details of the technical issue, including any observations or symptoms."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit">Submit Technical Report</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

QuickReportsPage.title = 'Quick Reports';

export default QuickReportsPage;
