
'use server';

import { z } from 'zod';
import { analyzeQualityAudit } from '@/ai/flows/analyze-quality-audit-flow';

const schema = z.object({
  auditText: z.string().min(20, 'Audit report text must be at least 20 characters long.'),
});

export async function analyzeAuditAction(prevState: any, formData: FormData) {
  const validatedFields = schema.safeParse({
    auditText: formData.get('auditText'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data',
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  try {
    const result = await analyzeQualityAudit({
      auditText: validatedFields.data.auditText,
    });
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
