

'use server';

import { z } from 'zod';
import { suggestInvestigationSteps } from '@/ai/flows/suggest-investigation-steps-flow';
import { generateCorrectiveActionPlan } from '@/ai/flows/generate-corrective-action-plan-flow';
import { promoteToRiskRegister } from '@/ai/flows/promote-to-risk-register-flow';
import { fiveWhysAnalysis } from '@/ai/flows/five-whys-analysis-flow';
import { suggestHazards } from '@/ai/flows/suggest-hazards-flow';
import { suggestIcaoCategory } from '@/ai/flows/suggest-icao-category-flow';
import type { SafetyReport, AssociatedRisk, SuggestInvestigationStepsOutput } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';


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
    
    // Persist the suggestions to the report in Firestore
    if (result && report.companyId && report.id) {
        const reportRef = doc(db, `companies/${report.companyId}/safety-reports`, report.id);
        await updateDoc(reportRef, {
            aiSuggestedSteps: result
        });
    }

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

  const validatedFields = reportSchema.safeParse({ report });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data',
      errors: validatedFields.error.flatten().fieldErrors,
      data: null,
    };
  }

  try {
    // The investigation notes are part of the report object from the form now
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

export async function promoteRiskAction(prevState: any, formData: FormData) {
    const reportString = formData.get('report');
    const riskString = formData.get('riskToPromote');

    if (!reportString || typeof reportString !== 'string' || !riskString || typeof riskString !== 'string') {
        return { message: 'Invalid data provided.', data: null };
    }

    try {
        const report: SafetyReport = JSON.parse(reportString);
        const riskToPromote: AssociatedRisk = JSON.parse(riskString);

        const result = await promoteToRiskRegister({ report, riskToPromote });

        return { message: 'Risk promoted successfully', data: { ...result, ...riskToPromote } };
    } catch (error) {
        console.error(error);
        return { message: 'An error occurred during promotion.', data: null };
    }
}

export async function fiveWhysAnalysisAction(prevState: any, formData: FormData) {
  const reportString = formData.get('report');

  if (!reportString || typeof reportString !== 'string') {
    return { message: 'Invalid report data provided.', data: null, errors: null };
  }

  try {
    const report: SafetyReport = JSON.parse(reportString);
    const result = await fiveWhysAnalysis({ report });
    return { message: '5 Whys analysis complete.', data: result, errors: null };
  } catch (error) {
    console.error(error);
    return { message: 'An error occurred during 5 Whys analysis.', data: null, errors: null };
  }
}

export async function suggestHazardsAction(prevState: any, formData: FormData) {
    const reportText = formData.get('reportText');

    if (!reportText || typeof reportText !== 'string') {
        return { message: 'Invalid report data provided.', data: null };
    }

    try {
        const result = await suggestHazards({ reportText });
        return { message: 'Hazard suggestion complete.', data: result };
    } catch (error) {
        console.error(error);
        return { message: 'An error occurred during hazard suggestion.', data: null };
    }
}

export async function suggestIcaoCategoryAction(prevState: any, formData: FormData) {
    const reportText = formData.get('reportText');

    if (!reportText || typeof reportText !== 'string') {
        return { message: 'Invalid report data provided.', data: null };
    }

    try {
        const result = await suggestIcaoCategory({ reportText });
        return { message: 'ICAO category suggestion complete.', data: result };
    } catch (error) {
        console.error(error);
        return { message: 'An error occurred during ICAO category suggestion.', data: null };
    }
}
