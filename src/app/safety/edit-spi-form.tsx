'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { subMonths, eachMonthOfInterval, format } from 'date-fns';
import type { SpiConfig } from '@/lib/types';

const spiFormSchema = z.object({
  name: z.string().min(3, 'Name is required.'),
  calculation: z.enum(['count', 'rate']),
  unit: z.string().optional(),
  targetDirection: z.enum(['<=', '>=']),
  target: z.coerce.number(),
  alert2: z.coerce.number(),
  alert3: z.coerce.number(),
  alert4: z.coerce.number(),
  isManual: z.boolean().default(false),
  filterType: z.string().optional(),
  filterSubCategory: z.string().optional(),
  manualData: z.record(z.coerce.number()).optional(),
});

type SpiFormValues = z.infer<typeof spiFormSchema>;

interface EditSpiFormProps {
  spi: SpiConfig;
  onUpdate: (updatedSpi: SpiConfig) => void;
}

const countUnits = ["Per Day", "Per Week", "Per Month", "Per Year"];

export function EditSpiForm({ spi, onUpdate }: EditSpiFormProps) {
  const { toast } = useToast();
  
  const last6Months = React.useMemo(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    return eachMonthOfInterval({ start, end }).map(date => format(date, 'MMM yy'));
  }, []);

  const form = useForm<SpiFormValues>({
    resolver: zodResolver(spiFormSchema),
    defaultValues: {
      name: spi.name,
      calculation: spi.calculation,
      unit: spi.unit,
      targetDirection: spi.targetDirection,
      target: spi.target,
      alert2: spi.alert2,
      alert3: spi.alert3,
      alert4: spi.alert4,
      isManual: spi.isManual || false,
      filterType: spi.filterType || 'All',
      filterSubCategory: spi.filterSubCategory || '',
      manualData: spi.manualData || last6Months.reduce((acc, m) => ({ ...acc, [m]: 0 }), {}),
    },
  });
  
  const calculationType = form.watch('calculation');
  const isManual = form.watch('isManual');

  const onSubmit = (data: SpiFormValues) => {
    onUpdate({
      ...spi,
      ...data,
    } as SpiConfig);
    toast({
      title: 'Indicator Updated',
      description: `Settings for ${data.name} have been saved.`,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Indicator Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Unstable Approach Rate" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label className="text-base">Manual Data Entry</Label>
                    <p className="text-sm text-muted-foreground">Input data points directly instead of deriving from reports.</p>
                </div>
                <FormField
                    control={form.control}
                    name="isManual"
                    render={({ field }) => (
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    )}
                />
            </div>
        </div>

        {!isManual && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <h4 className="font-semibold text-sm">Automated Filter Criteria</h4>
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="filterType"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Report Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="All">All Reports</SelectItem>
                                        <SelectItem value="Flight Operations Report">Flight Ops</SelectItem>
                                        <SelectItem value="Ground Operations Report">Ground Ops</SelectItem>
                                        <SelectItem value="Aircraft Defect Report">Defect Report</SelectItem>
                                        <SelectItem value="Occupational Report">Occupational</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="filterSubCategory"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sub-Category (Optional)</FormLabel>
                                <FormControl><Input placeholder="e.g., Unstable Approach" {...field} /></FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>
        )}

        {isManual && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <h4 className="font-semibold text-sm">Monthly Data Points</h4>
                <div className="grid grid-cols-3 gap-4">
                    {last6Months.map(month => (
                        <FormField
                            key={month}
                            control={form.control}
                            name={`manualData.${month}`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">{month}</FormLabel>
                                    <FormControl>
                                        <Input type="number" step="0.1" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    ))}
                </div>
            </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
              control={form.control}
              name="calculation"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Calculation</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="count">Count</SelectItem>
                            <SelectItem value="rate">Rate</SelectItem>
                        </SelectContent>
                    </Select>
                  <FormMessage />
                  </FormItem>
              )}
          />
           <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Label</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a unit" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {countUnits.map(unit => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
              )}
          />
        </div>

        <div className="space-y-4">
            <h4 className="font-semibold text-sm">Alert Thresholds</h4>
            <FormField
                control={form.control}
                name="targetDirection"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Target Direction</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="<=">Less is Better (e.g. Incidents, Defects)</SelectItem>
                            <SelectItem value=">=">More is Better (e.g. Training, Compliance)</SelectItem>
                        </SelectContent>
                    </Select>
                    </FormItem>
                )}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="target" render={({ field }) => (<FormItem><FormLabel>Target Level</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="alert2" render={({ field }) => (<FormItem><FormLabel>A2: Monitor</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="alert3" render={({ field }) => (<FormItem><FormLabel>A3: Action Required</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="alert4" render={({ field }) => (<FormItem><FormLabel>A4: Urgent Action</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl></FormItem>)} />
            </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="submit">Save Performance Indicator</Button>
        </div>
      </form>
    </Form>
  );
}
