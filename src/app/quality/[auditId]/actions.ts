
'use server';

import { z } from 'zod';

const schema = z.object({
  auditText: z.string().min(20, 'Audit report text must be at least 20 characters long.'),
});

export async function generateCapAction(prevState: any, formData: FormData) {
    // AI functionality removed due to build errors.
    return {
        message: 'AI feature is currently disabled.',
        data: null,
        errors: null,
    };
}
