
'use server';

import { z } from 'zod';
import { suggestInvestigationSteps } from '@/ai/flows/suggest-investigation-steps-flow';
import { generateCorrectiveActionPlan } from '@/ai/flows/generate-corrective-action-plan-flow';
import type { SafetyReport } from '@/lib/types';

const reportSchema = z.object({
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

  const validatedFields = reportSchema.safeParse({ report });

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

export async function generatePlanAction(prevState: any, formData: FormData) {
  const reportString = formData.get('report');

  if (!reportString || typeof reportString !== 'string') {
    return {
      message: 'Invalid report data provided.',
      data: null,
      errors: null,
    };
  }
  
  const report: SafetyReport = JSON.parse(reportString);

  // Note: We're also grabbing the live investigation notes from the form
  const investigationNotes = formData.get('investigationNotes') as string;
  report.investigationNotes = investigationNotes;

  const validatedFields = reportSchema.safeParse({ report });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data',
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  try {
    const result = await generateCorrectiveActionPlan({
      report: validatedFields.data.report,
    });
    return {
      message: 'Plan generated',
      data: result,
      errors: null,
    };
  } catch (error) {
    console.error(error);
    return {
      message: 'An error occurred during plan generation.',
      data: null,
      errors: null,
    };
  }
}

    