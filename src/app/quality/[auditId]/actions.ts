
'use server';

import { z } from 'zod';
import { analyzeQualityAudit } from '@/ai/flows/analyze-quality-audit-flow';
import { generateQualityCap } from '@/ai/flows/generate-quality-cap-flow';

const schema = z.object({
  auditText: z.string().min(20, 'Audit report text must be at least 20 characters long.'),
});

export async function generateCapAction(prevState: any, formData: FormData) {
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
        const result = await generateQualityCap({
        nonConformanceText: validatedFields.data.auditText,
        });
        return {
        message: 'CAP suggestion complete',
        data: result,
        errors: null,
        };
    } catch (error) {
        console.error(error);
        return {
        message: 'An error occurred during CAP generation.',
        data: null,
        errors: null,
        };
    }
}
