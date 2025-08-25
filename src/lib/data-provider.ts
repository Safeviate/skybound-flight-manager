
'use client';

import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Airport, SafetyReport, Risk, QualityAudit, AuditScheduleItem, Alert, Company, ComplianceItem, RiskLikelihood, RiskSeverity } from './types';

export const airportData: Airport[] = [];
export const aircraftData: Aircraft[] = [];
export let userData: Omit<User, 'id'>[] = [];
export const studentData: User[] = [];
export let bookingData: Booking[] = [];
export const trainingExercisesData: string[] = [
    'Pre-Solo Written Exam',
    'First Solo',
    'Cross-Country',
    'Night Flying',
    'Instrument Rating',
    'Commercial Pilot License',
    'Multi-Engine Rating',
];
export let safetyReportData: SafetyReport[] = [];
export let riskRegisterData: Risk[] = [];
export let qualityAuditData: QualityAudit[] = [];
export let auditScheduleData: AuditScheduleItem[] = [];
export let allAlerts: Alert[] = [];
export let companyData: Company[] = [];

export const likelihoodValues: RiskLikelihood[] = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Certain'];
export const severityValues: RiskSeverity[] = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

export const complianceData: Omit<ComplianceItem, 'id'|'companyId'|'lastAuditDate'|'nextAuditDate'|'findings'>[] = [];
