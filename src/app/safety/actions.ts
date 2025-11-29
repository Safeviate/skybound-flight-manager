
'use server';

import { z } from 'zod';

const schema = z.object({
  reportText: z.string().min(20, 'Report text must be at least 20 characters long.'),
});

export async function analyzeReportAction(prevState: any, formData: FormData) {
  // This is a placeholder. The AI functionality has been disabled.
  return {
    message: 'AI feature is currently disabled.',
    data: null,
    errors: null,
  };
}
