
'use client';

import {
  aircraftData as mockAircraftData,
  bookingData as mockBookingData,
  checklistData as mockChecklistData,
  completedChecklistData as mockCompletedChecklistData,
  safetyReportData as mockSafetyReportData,
  riskRegisterData as mockRiskRegisterData,
  qualityAuditData as mockQualityAuditData,
  auditScheduleData as mockAuditScheduleData,
  auditChecklistData as mockAuditChecklistData,
  mockAlerts,
  userData as mockUserData,
  airportData as mockAirportData,
  trainingExercisesData as mockTrainingExercisesData
} from './mock-data';
import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Checklist, Airport, SafetyReport, Risk, QualityAudit, AuditScheduleItem, AuditChecklist, Alert, CompletedChecklist } from './types';


const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

// In a real application, the 'false' branch of these conditions
// would contain functions to fetch data from a live database (e.g., Firestore).
// For now, they return empty arrays or default values to prevent crashes.

export const airportData: Airport[] = useMockData ? mockAirportData : [];
export const aircraftData: Aircraft[] = useMockData ? mockAircraftData : [];
export const userData: User[] = useMockData ? mockUserData : [];
export const bookingData: Booking[] = useMockData ? mockBookingData : [];
export const trainingExercisesData: string[] = useMockData ? mockTrainingExercisesData : [];
export const checklistData: Checklist[] = useMockData ? mockChecklistData : [];
export const completedChecklistData: CompletedChecklist[] = useMockData ? mockCompletedChecklistData : [];
export const safetyReportData: SafetyReport[] = useMockData ? mockSafetyReportData : [];
export const riskRegisterData: Risk[] = useMockData ? mockRiskRegisterData : [];
export const qualityAuditData: QualityAudit[] = useMockData ? mockQualityAuditData : [];
export const auditScheduleData: AuditScheduleItem[] = useMockData ? mockAuditScheduleData : [];
export const auditChecklistData: AuditChecklist[] = useMockData ? mockAuditChecklistData : [];
export const allAlerts: Alert[] = useMockData ? mockAlerts : [];

