/**
 * @fileOverview A dedicated API route to execute Genkit flows.
 * This route is called by Server Actions to work around
 * module resolution issues with Genkit in Next.js.
 */

import { NextResponse } from 'next/server';
import { generateMocPlanFlow } from '@/ai/flows/internal/generate-moc-plan-flow-internal';
import { analyzeSafetyReportFlow } from '@/ai/flows/internal/analyze-safety-report-flow-internal';
import { scanAircraftInfoFlow } from '@/ai/flows/internal/scan-aircraft-info-flow-internal';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { flow, input } = await req.json();

    let result;
    switch (flow) {
      case 'generateMocPlan':
        result = await generateMocPlanFlow(input);
        break;
      case 'analyzeSafetyReport':
        result = await analyzeSafetyReportFlow(input);
        break;
      case 'scanAircraftInfo':
        result = await scanAircraftInfoFlow(input);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid flow specified' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('Error in /api/genkit-flow:', error);
    return NextResponse.json(
      { error: 'Failed to execute Genkit flow', details: error.message },
      { status: 500 }
    );
  }
}
