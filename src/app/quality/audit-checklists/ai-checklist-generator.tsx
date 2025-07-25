
'use client';

import * as React from 'react';
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Loader2, Save, Wand2 } from 'lucide-react';
import { generateAuditChecklist } from '@/ai/flows/generate-audit-checklist-flow';
import type { GenerateAuditChecklistOutput } from '@/ai/flows/generate-audit-checklist-flow';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

const generatorFormSchema = z.object({
  topic: z.string().min(5, { message: 'Topic must be at least 5 characters long.' }),
  numItems: z.coerce.number().int().min(3, 'Must have at least 3 items.').max(20, 'Cannot exceed 20 items.'),
});

type GeneratorFormValues = z.infer<typeof generatorFormSchema>;

interface AiChecklistGeneratorProps {
  onSave: (data: { title: string; items: { text: string }[] }) => void;
}

export function AiChecklistGenerator({ onSave }: AiChecklistGeneratorProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [generatedChecklist, setGeneratedChecklist] = React.useState<GenerateAuditChecklistOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<GeneratorFormValues>({
    resolver: zodResolver(generatorFormSchema),
    defaultValues: {
      topic: '',
      numItems: 10,
    },
  });

  const handleGeneration = async (data: GeneratorFormValues) => {
    setIsLoading(true);
    setGeneratedChecklist(null);
    try {
      const result = await generateAuditChecklist(data);
      setGeneratedChecklist(result);
      toast({
        title: 'Checklist Generated',
        description: 'Review the generated checklist below.',
      });
    } catch (error) {
      console.error('Error generating checklist:', error);
      toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate checklist from AI.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSave = () => {
    if (generatedChecklist) {
        onSave({
            title: generatedChecklist.title,
            items: generatedChecklist.items,
        })
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleGeneration)} className="space-y-4">
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Audit Topic</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Hangar Safety and Tool Management" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="numItems"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Checklist Items</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Generate Checklist
            </Button>
          </div>
        </form>
      </Form>
      
      {generatedChecklist && (
        <>
            <Separator />
            <Card>
                <CardHeader>
                    <CardTitle>{generatedChecklist.title}</CardTitle>
                    <CardDescription>Review the AI-generated checklist items. You can save this as a new template.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-72">
                        <ul className="space-y-2 list-disc list-inside bg-muted p-4 rounded-md">
                            {generatedChecklist.items.map((item, index) => (
                                <li key={index} className="text-sm">{item.text}</li>
                            ))}
                        </ul>
                    </ScrollArea>
                </CardContent>
                <CardFooter>
                     <Button onClick={handleSave} className="w-full">
                        <Save className="mr-2 h-4 w-4" />
                        Save as New Checklist Template
                    </Button>
                </CardFooter>
            </Card>
        </>
      )}
    </div>
  );
}
