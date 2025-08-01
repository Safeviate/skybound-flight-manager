
'use client';

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
import type { SafetyReport } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type SpiConfig = {
    id: string;
    name: string;
    type: 'Leading Indicator' | 'Lagging Indicator';
    calculation: 'count' | 'rate';
    unit?: string; // e.g., "per 100 hours"
    targetDirection: '<=' | '>=';
    target: number;
    alert2: number;
    alert3: number;
    alert4: number;
    filter: (report: SafetyReport) => boolean;
};

const spiFormSchema = z.object({
  name: z.string().min(3, 'Name is required.'),
  calculation: z.enum(['count', 'rate']),
  unit: z.string().optional(),
  targetDirection: z.enum(['<=', '>=']),
  target: z.coerce.number(),
  alert2: z.coerce.number(),
  alert3: z.coerce.number(),
  alert4: z.coerce.number(),
}).refine(data => {
    if (data.calculation === 'rate' && !data.unit) {
        return false;
    }
    return true;
}, {
    message: "Unit is required for rate calculations.",
    path: ["unit"],
});


type SpiFormValues = z.infer<typeof spiFormSchema>;

interface EditSpiFormProps {
  spi: SpiConfig;
  onUpdate: (updatedSpi: SpiConfig) => void;
}

const countUnits = ["Per Day", "Per Week", "Per Month", "Per Year"];

export function EditSpiForm({ spi, onUpdate }: EditSpiFormProps) {
  const { toast } = useToast();
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
    },
  });
  
  const calculationType = form.watch('calculation');

  function onSubmit(data: SpiFormValues) {
    onUpdate({
      ...spi,
      ...data,
    });
    toast({
      title: 'SPI Targets Updated',
      description: `The targets for ${spi.name} have been saved.`,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                            <SelectValue placeholder="Select calculation type" />
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
                    <FormLabel>Unit</FormLabel>
                    {calculationType === 'count' ? (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a unit" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {countUnits.map(unit => (
                                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <FormControl>
                            <Input placeholder="e.g., per 100 hours" {...field} />
                        </FormControl>
                    )}
                    <FormMessage />
                  </FormItem>
              )}
          />
        </div>

         <FormField
            control={form.control}
            name="targetDirection"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Target Direction</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select target direction" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="<=">Less than or equal to (&le;)</SelectItem>
                        <SelectItem value=">=">Greater than or equal to (&ge;)</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
        />
        
        <p className="text-sm font-medium text-foreground pt-2">Alert Levels</p>
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Target</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="alert2"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Alert Level 2 (Monitor)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="alert3"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Alert Level 3 (Action)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="alert4"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Alert Level 4 (Urgent)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </Form>
  );
}
