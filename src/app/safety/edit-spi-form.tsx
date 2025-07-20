
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

export type SpiConfig = {
    id: string;
    name: string;
    type: 'Leading Indicator' | 'Lagging Indicator';
    calculation: 'count' | 'rate';
    unit?: 'per 100 hours';
    target: number;
    alert2: number;
    alert3: number;
    alert4: number;
    filter: (report: SafetyReport) => boolean;
};

const spiFormSchema = z.object({
  target: z.coerce.number().min(0, 'Value must be positive.'),
  alert2: z.coerce.number().min(0, 'Value must be positive.'),
  alert3: z.coerce.number().min(0, 'Value must be positive.'),
  alert4: z.coerce.number().min(0, 'Value must be positive.'),
});

type SpiFormValues = z.infer<typeof spiFormSchema>;

interface EditSpiFormProps {
  spi: SpiConfig;
  onUpdate: (updatedSpi: SpiConfig) => void;
}

export function EditSpiForm({ spi, onUpdate }: EditSpiFormProps) {
  const { toast } = useToast();
  const form = useForm<SpiFormValues>({
    resolver: zodResolver(spiFormSchema),
    defaultValues: {
      target: spi.target,
      alert2: spi.alert2,
      alert3: spi.alert3,
      alert4: spi.alert4,
    },
  });

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
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="target"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Target (&lt;=)</FormLabel>
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
