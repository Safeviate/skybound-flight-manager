
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
  subcomponent: z.string().optional(),
  description: z.string().min(10, 'A detailed description is required.'),
});

type TechnicalReportFormValues = z.infer<typeof technicalReportSchema>;

const componentHierarchy = {
    "Airframe": ["Fuselage", "Wings", "Empennage", "Doors", "Windows"],
    "Powerplant": ["Engine", "Propeller", "Exhaust System", "Ignition System", "Fuel System (Engine)"],
    "Landing Gear": ["Main Gear", "Nose Gear", "Wheels", "Tires", "Brakes"],
    "Avionics/Instruments": ["GPS/Navigation", "Com Radio", "Transponder", "Attitude Indicator", "Airspeed Indicator", "Altimeter", "Other Instrument"],
    "Flight Controls": ["Ailerons", "Elevator/Stabilator", "Rudder", "Flaps", "Control Cables/Rods"],
    "Fuel System": ["Tanks", "Lines & Hoses", "Pumps", "Gauges"],
    "Electrical System": ["Battery", "Alternator/Generator", "Wiring", "Circuit Breakers", "Lighting"],
    "Interior/Cabin": ["Seats", "Belts/Harnesses", "HVAC", "Panels/Trim"],
    "Other": [],
};

const componentOptions = Object.keys(componentHierarchy);

function QuickReportsPage() {
  const { user, company } = useUser();
  const { toast } = useToast();
  const [aircraftList, setAircraftList] = React.useState<Aircraft[]>([]);

  const form = useForm<TechnicalReportFormValues>({
    resolver: zodResolver(technicalReportSchema),
    defaultValues: {
      aircraftRegistration: '',
      component: '',
      subcomponent: '',
      description: '',
    },
  });

  const selectedComponent = form.watch('component');
  const subcomponentOptions = selectedComponent ? componentHierarchy[selectedComponent as keyof typeof componentHierarchy] : [];

  React.useEffect(() => {
    // Reset subcomponent when component changes
    form.setValue('subcomponent', '');
  }, [selectedComponent, form]);

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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    {subcomponentOptions && subcomponentOptions.length > 0 && (
                        <FormField
                        control={form.control}
                        name="subcomponent"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Sub-component</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select sub-component..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                {subcomponentOptions.map(subcomp => (
                                    <SelectItem key={subcomp} value={subcomp}>{subcomp}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    )}
                 </div>
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

