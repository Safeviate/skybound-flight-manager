
/**
 * @fileOverview A dedicated API route to execute the Genkit flow.
 * This route is called by the `generateMocPlan` Server Action to work around
 * a potential module resolution issue with Genkit in Next.js Server Actions.
 */

import { NextResponse } from 'next/server';
import { generateMocPlanFlow } from '@/ai/flows/internal/generate-moc-plan-flow-internal';

export async function POST(req: Request) {
  try {
    const input = await req.json();
    console.log('API route /api/genkit-flow received request:', input);
    
    // Directly invoke the Genkit flow with the parsed input.
    const result = await generateMocPlanFlow(input);
    
    console.log('Genkit flow executed successfully in API route.');
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Error in /api/genkit-flow:', error);
    return NextResponse.json(
      { error: 'Failed to execute Genkit flow', details: error.message },
      { status: 500 }
    );
  }
}
