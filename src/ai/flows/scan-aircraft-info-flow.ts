'use server';
/**
 * @fileOverview An AI flow for scanning aircraft information like registration and Hobbs meters from images.
 *
 * - scanAircraftInfo - A function that handles the scanning process.
 * - ScanAircraftInfoInput - The input type for the scanAircraftInfo function.
 * - ScanAircraftInfoOutput - The return type for the scanAircraftInfo function.
 */
import {
  scanAircraftInfoFlow,
  type ScanAircraftInfoInput,
  type ScanAircraftInfoOutput,
} from './internal/scan-aircraft-info-flow-internal';

export type { ScanAircraftInfoInput, ScanAircraftInfoOutput };

export async function scanAircraftInfo(
  input: ScanAircraftInfoInput
): Promise<ScanAircraftInfoOutput> {
  return await scanAircraftInfoFlow(input);
}
