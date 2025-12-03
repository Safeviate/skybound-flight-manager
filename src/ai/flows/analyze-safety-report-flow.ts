'use server';
/**
 * @fileOverview An AI flow for assessing the tone and severity of safety reports.
 *
 * - analyzeSafetyReport - A function that handles the safety report analysis.
 * - AnalyzeSafetyReportInput - The input type for the analyzeSafetyReport function.
 * - AnalyzeSafetyReportOutput - The return type for the analyzeSafetyReport function.
 */

import type { AnalyzeSafetyReportInput, AnalyzeSafetyReportOutput } from './internal/analyze-safety-report-flow-internal';

export type { AnalyzeSafetyReportInput, AnalyzeSafetyReportOutput };

export async function analyzeSafetyReport(input: AnalyzeSafetyReportInput): Promise<AnalyzeSafetyReportOutput> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const flowUrl = `${baseUrl}/api/genkit-flow`;
  
  const response = await fetch(flowUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ flow: 'analyzeSafetyReport', input }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Genkit flow execution failed:', errorBody);
    throw new Error(`Genkit flow failed with status: ${response.status}`);
  }

  const data = await response.json();
  return data.result;
}
