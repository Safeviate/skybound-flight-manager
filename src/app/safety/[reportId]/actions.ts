
'use server';

import { z } from 'zod';
import type { AssociatedRisk, SafetyReport } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const suggestHazardsSchema = z.object({
  reportText: z.string().min(20, 'Report text must be at least 20 characters long.'),
});

export async function suggestHazardsAction(prevState: any, formData: FormData) {
    const validatedFields = suggestHazardsSchema.safeParse({
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
        // AI functionality removed due to build errors.
        return {
            message: 'AI feature is currently disabled.',
            data: { suggestedHazards: [] },
            errors: null,
        };
    } catch (error) {
        console.error(error);
        return {
        message: 'An error occurred during hazard suggestion.',
        data: null,
        errors: null,
        };
    }
}

const promoteRiskSchema = z.object({
  riskToPromote: z.string(),
  report: z.string(),
});

export async function promoteRiskAction(prevState: any, formData: FormData) {
  const validatedFields = promoteRiskSchema.safeParse({
    riskToPromote: formData.get('riskToPromote'),
    report: formData.get('report'),
  });

  if (!validatedFields.success) {
    return {
      message: 'Invalid form data for promoting risk',
      data: null,
    };
  }
  
  const riskToPromote: AssociatedRisk = JSON.parse(validatedFields.data.riskToPromote);
  const report: SafetyReport = JSON.parse(validatedFields.data.report);

  const newRisk = {
    id: `risk-${Date.now()}`,
    companyId: report.companyId,
    description: riskToPromote.hazard,
    hazard: riskToPromote.hazard,
    risk: riskToPromote.risk,
    consequences: [riskToPromote.risk],
    likelihood: riskToPromote.likelihood,
    severity: riskToPromote.severity,
    riskScore: riskToPromote.riskScore,
    mitigation: riskToPromote.mitigationControls || 'To be determined.',
    status: 'Open',
    dateIdentified: new Date().toISOString().split('T')[0],
    hazardArea: riskToPromote.hazardArea,
    process: riskToPromote.process,
    reportNumber: report.reportNumber,
  };

  try {
    const riskRef = doc(db, `companies/${report.companyId}/risks`, newRisk.id);
    await setDoc(riskRef, newRisk);
    return {
      message: 'Risk promoted successfully',
      data: newRisk,
    };
  } catch (error) {
    console.error("Error promoting risk:", error);
    return {
      message: 'An error occurred while promoting the risk.',
      data: null,
    };
  }
}


const fiveWhysSchema = z.object({
  report: z.string(),
});

export async function fiveWhysAnalysisAction(prevState: any, formData: FormData) {
    const validatedFields = fiveWhysSchema.safeParse({
        report: formData.get('report'),
    });

    if (!validatedFields.success) {
        return { message: 'Invalid form data', data: null, errors: validatedFields.error.flatten().fieldErrors };
    }

    try {
        // AI functionality removed due to build errors.
        return {
            message: 'AI feature is currently disabled.',
            data: null,
            errors: null,
        };
    } catch (error) {
        console.error(error);
        return { message: 'An error occurred during 5 Whys analysis.', data: null, errors: null };
    }
}


const correctiveActionPlanSchema = z.object({
  report: z.string(),
});

export async function generatePlanAction(prevState: any, formData: FormData) {
  const validatedFields = correctiveActionPlanSchema.safeParse({
    report: formData.get('report'),
  });

  if (!validatedFields.success) {
    return { message: 'Invalid form data', data: null, errors: validatedFields.error.flatten().fieldErrors };
  }

  try {
    // AI functionality removed due to build errors.
    return {
        message: 'AI feature is currently disabled.',
        data: null,
        errors: null,
    };
  } catch (error) {
    console.error(error);
    return { message: 'An error occurred during plan generation.', data: null, errors: null };
  }
}


const suggestStepsSchema = z.object({
    report: z.string(),
});

export async function suggestStepsAction(prevState: any, formData: FormData) {
    const validatedFields = suggestStepsSchema.safeParse({
        report: formData.get('report'),
    });

    if (!validatedFields.success) {
        return { message: 'Invalid form data', data: null, errors: validatedFields.error.flatten().fieldErrors };
    }

    try {
        // AI functionality removed due to build errors.
        return {
            message: 'AI feature is currently disabled.',
            data: {
                initialAssessment: '',
                keyAreasToInvestigate: [],
                recommendedActions: [],
                potentialContributingFactors: [],
            },
            errors: null,
        };
    } catch (error) {
        console.error(error);
        return { message: 'An error occurred while generating investigation steps.', data: null, errors: null };
    }
}

const suggestIcaoCategorySchema = z.object({
  reportText: z.string().min(1, 'Report text cannot be empty.'),
});

export async function suggestIcaoCategoryAction(prevState: any, formData: FormData) {
    const validatedFields = suggestIcaoCategorySchema.safeParse({
        reportText: formData.get('reportText'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Invalid form data',
            data: null,
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    try {
        // AI functionality removed due to build errors.
        return {
            message: 'AI feature is currently disabled.',
            data: null,
            errors: null,
        };
    } catch (error) {
        console.error("Error suggesting ICAO category:", error);
        return {
            message: 'An error occurred during ICAO category suggestion.',
            data: null,
            errors: null,
        };
    }
}
