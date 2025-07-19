
'use server';

import { z } from 'zod';
import { suggestInvestigationSteps } from '@/ai/flows/suggest-investigation-steps-flow';
import type { SafetyReport } from '@/lib/types';

const schema = z.object({
  report: z.any(),
});

export async function suggestStepsAction(prevState: any, formData: FormData) {
  const reportString = formData.get('report');

  if (!reportString || typeof reportString !== 'string') {
    return {
      message: 'Invalid report data provided.',
      data: null,
      errors: null,
    };
  }
  
  const report: SafetyReport = JSON.parse(reportString);

  const validatedFields = schema.safeParse({ report });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data',
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  try {
    const result = await suggestInvestigationSteps({
      report: validatedFields.data.report,
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
