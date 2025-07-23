
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
  trainingExercisesData as mockTrainingExercisesData,
  companyData as mockCompanyData,
} from './mock-data';
import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Checklist, Airport, SafetyReport, Risk, QualityAudit, AuditScheduleItem, AuditChecklist, Alert, CompletedChecklist, Company } from './types';
import config from '@/config';


const useMockData = config.useMockData;

// In a real application, the 'false' branch of these conditions
// would contain functions to fetch data from a live database (e.g., Firestore).
// For now, they return empty arrays or default values to prevent crashes.

export const airportData: Airport[] = useMockData ? mockAirportData : [];
export let aircraftData: Aircraft[] = useMockData ? mockAircraftData : [];
export let userData: User[] = useMockData ? mockUserData : [];
export let bookingData: Booking[] = useMockData ? mockBookingData : [];
export const trainingExercisesData: string[] = useMockData ? mockTrainingExercisesData : [];
export let checklistData: Checklist[] = useMockData ? mockChecklistData : [];
export let completedChecklistData: CompletedChecklist[] = useMockData ? mockCompletedChecklistData : [];
export let safetyReportData: SafetyReport[] = useMockData ? mockSafetyReportData : [];
export let riskRegisterData: Risk[] = useMockData ? mockRiskRegisterData : [];
export let qualityAuditData: QualityAudit[] = useMockData ? mockQualityAuditData : [];
export let auditScheduleData: AuditScheduleItem[] = useMockData ? mockAuditScheduleData : [];
export let auditChecklistData: AuditChecklist[] = useMockData ? mockAuditChecklistData : [];
export let allAlerts: Alert[] = useMockData ? mockAlerts : [];
export let companyData: Company[] = useMockData ? mockCompanyData : [];

// Functions to modify mock data in memory
export function addCompany(newCompany: Company) {
    if (useMockData) {
        companyData.push(newCompany);
    }
}

export function addUser(newUser: User) {
    if (useMockData) {
        userData.push(newUser);
    }
}
