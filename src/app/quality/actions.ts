'use server';

/**
 * AI analysis actions removed as per user request to disable AI features.
 */
export async function analyzeAuditAction(prevState: any, formData: FormData) {
    return {
        message: 'AI feature is currently disabled.',
        data: null,
        errors: null,
    };
}
