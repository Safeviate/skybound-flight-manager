'use server';

import { z } from 'zod';
import { analyzeSafetyReportTone } from '@/ai/flows/analyze-safety-report-tone';

const schema = z.object({
  reportText: z.string().min(20, 'Report text must be at least 20 characters long.'),
});

export async function analyzeReportAction(prevState: any, formData: FormData) {
  const validatedFields = schema.safeParse({
    reportText: formData.get('reportText'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data',
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  try {
    const result = await analyzeSafetyReportTone({
      reportText: validatedFields.data.reportText,
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
