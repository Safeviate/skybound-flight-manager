
'use server';

import { z } from 'zod';
import { generateAuditChecklist } from '@/ai/flows/generate-audit-checklist-flow';

const schema = z.object({
  topic: z.string().min(3, 'Topic must be at least 3 characters long.'),
  numItems: z.coerce.number().int().min(3, 'Must generate at least 3 items.').max(20, 'Cannot generate more than 20 items.'),
});

export async function generateChecklistAction(prevState: any, formData: FormData) {
  const validatedFields = schema.safeParse({
    topic: formData.get('topic'),
    numItems: formData.get('numItems'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data',
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  try {
    const result = await generateAuditChecklist(validatedFields.data);
    return {
      message: 'Analysis complete',
      data: result,
      errors: null,
    };
  } catch (error) {
    console.error(error);
    return {
      message: 'An error occurred during analysis.',
      data: null,
      errors: null,
    };
  }
}
