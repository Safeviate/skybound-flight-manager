'use server';
/**
 * @fileOverview An AI flow for scanning aircraft information like registration and Hobbs meters from images.
 *
 * - scanAircraftInfo - A function that handles the scanning process.
 * - ScanAircraftInfoInput - The input type for the scanAircraftInfo function.
 * - ScanAircraftInfoOutput - The return type for the scanAircraftInfo function.
 */
import type { ScanAircraftInfoInput, ScanAircraftInfoOutput } from './internal/scan-aircraft-info-flow-internal';

export type { ScanAircraftInfoInput, ScanAircraftInfoOutput };

export async function scanAircraftInfo(input: ScanAircraftInfoInput): Promise<ScanAircraftInfoOutput> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const flowUrl = `${baseUrl}/api/genkit-flow`;

  const response = await fetch(flowUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ flow: 'scanAircraftInfo', input }),
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
