'use server';
/**
 * @fileOverview An AI flow for assessing the tone and severity of safety reports.
 *
 * - analyzeSafetyReport - A function that handles the safety report analysis.
 * - AnalyzeSafetyReportInput - The input type for the analyzeSafetyReport function.
 * - AnalyzeSafetyReportOutput - The return type for the analyzeSafetyReport function.
 */

import {
  analyzeSafetyReportFlow,
  type AnalyzeSafetyReportInput,
  type AnalyzeSafetyReportOutput,
} from './internal/analyze-safety-report-flow-internal';

export type { AnalyzeSafetyReportInput, AnalyzeSafetyReportOutput };

export async function analyzeSafetyReport(
  input: AnalyzeSafetyReportInput
): Promise<AnalyzeSafetyReportOutput> {
  return await analyzeSafetyReportFlow(input);
}
