
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Exam, ExamQuestion } from '@/lib/types';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEffect } from 'react';

const questionOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Option text cannot be empty.'),
});

const examQuestionSchema = z.object({
  id: z.string(),
  text: z.string().min(5, 'Question text is required.'),
  options: z.array(questionOptionSchema).min(2, 'At least two options are required.'),
  correctAnswer: z.string().min(1, 'You must select a correct answer.'),
  explanation: z.string().optional(),
});

const examFormSchema = z.object({
  title: z.string().min(3, 'Exam title is required.'),
  category: z.string().min(3, 'Category is required.'),
  questions: z.array(examQuestionSchema).min(1, 'At least one question is required.'),
});

type ExamFormValues = z.infer<typeof examFormSchema>;

interface ExamFormProps {
  onSubmit: (data: Omit<Exam, 'id' | 'companyId'>) => void;
  existingExam?: Exam | null;
}

export function ExamForm({ onSubmit, existingExam }: ExamFormProps) {
  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: existingExam || {
      title: '',
      category: '',
      questions: [{ id: `q-${Date.now()}`, text: '', options: [{ id: `o-1`, text: ''}, { id: `o-2`, text: ''}], correctAnswer: '', explanation: '' }],
    },
  });

  useEffect(() => {
    if (existingExam) {
        form.reset(existingExam);
    }
  }, [existingExam, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'questions',
  });

  const { control } = form;

  const handleFormSubmit = (data: ExamFormValues) => {
    onSubmit(data);
  };
  
  const addOption = (questionIndex: number) => {
    const questions = form.getValues('questions');
    const question = questions[questionIndex];
    const newOption = { id: `o-${Date.now()}`, text: '' };
    form.setValue(`questions.${questionIndex}.options`, [...question.options, newOption]);
  };
  
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const questions = form.getValues('questions');
    const question = questions[questionIndex];
    const updatedOptions = question.options.filter((_, i) => i !== optionIndex);
    form.setValue(`questions.${questionIndex}.options`, updatedOptions);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={control} name="title" render={({ field }) => (<FormItem><FormLabel>Exam Title</FormLabel><FormControl><Input placeholder="e.g., PPL Air Law" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., PPL" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <div>
              <FormLabel>Questions</FormLabel>
              <div className="space-y-4 mt-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-3 relative">
                    <FormField control={control} name={`questions.${index}.text`} render={({ field }) => (<FormItem><FormLabel>Question {index + 1}</FormLabel><FormControl><Textarea placeholder="Enter question text..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                    
                    <FormField
                      control={control}
                      name={`questions.${index}.correctAnswer`}
                      render={({ field: radioField }) => (
                        <FormItem>
                           <FormLabel>Options (select the correct answer)</FormLabel>
                           <RadioGroup onValueChange={radioField.onChange} value={radioField.value}>
                                {form.watch(`questions.${index}.options`).map((option, optionIndex) => (
                                    <div key={option.id} className="flex items-center gap-2">
                                        <FormControl>
                                            <RadioGroupItem value={option.id} />
                                        </FormControl>
                                         <FormField control={control} name={`questions.${index}.options.${optionIndex}.text`} render={({ field }) => (<FormItem className="flex-1"><FormControl><Input placeholder={`Option ${optionIndex + 1}`} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(index, optionIndex)} disabled={form.getValues(`questions.${index}.options`).length <= 2}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </RadioGroup>
                            <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="button" variant="outline" size="sm" onClick={() => addOption(index)}>
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                    </Button>
                    
                    <FormField control={control} name={`questions.${index}.explanation`} render={({ field }) => (<FormItem><FormLabel>Explanation (Optional)</FormLabel><FormControl><Textarea placeholder="Explain why the correct answer is right..." {...field} /></FormControl><FormMessage /></FormItem>)} />

                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)} disabled={fields.length <= 1}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={() => append({ id: `q-${Date.now()}`, text: '', options: [{ id: `o-1`, text: ''}, { id: `o-2`, text: ''}], correctAnswer: '', explanation: '' })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                </Button>
                 {form.formState.errors.questions && <FormMessage>{form.formState.errors.questions.message}</FormMessage>}
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end pt-4 border-t">
          <Button type="submit">{existingExam ? 'Save Changes' : 'Create Exam'}</Button>
        </div>
      </form>
    </Form>
  );
}
