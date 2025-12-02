import { NextResponse } from 'next/server';
// ⚠️ This is where we safely import the problematic genkit code.
// The API Route handler uses the standard Node.js server bundle, NOT the Flight Loader.
import { generateMocPlanFlow } from '@/ai/flows/internal/generate-moc-plan-flow-internal'; 
import type { GenerateMocPlanInput } from '@/ai/flows/internal/generate-moc-plan-flow-internal';

// This handler receives the request from your Server Action
export async function POST(request: Request) {
  try {
    const args = (await request.json()) as GenerateMocPlanInput;
    
    // Execute the Genkit logic safely here
    const result = await generateMocPlanFlow(args); 

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Genkit API Error:', error);
    return NextResponse.json({ error: 'Failed to run Genkit flow.', details: error.message }, { status: 500 });
  }
}
