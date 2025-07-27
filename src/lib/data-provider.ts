
'use client';

// This file is being kept for now to avoid breaking imports, but it no longer provides mock data.
// All data fetching is now handled directly by components from Firestore.
import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Checklist, Airport, SafetyReport, Risk, QualityAudit, AuditScheduleItem, AuditChecklist, Alert, CompletedChecklist, Company } from './types';
import { ROLE_PERMISSIONS } from './types';

export const airportData: Airport[] = [];
export let aircraftData: Aircraft[] = [
    {
        id: 'N12345',
        companyId: 'skybound-aero',
        tailNumber: 'N12345',
        model: 'Cessna 172 Skyhawk',
        status: 'Available',
        hours: 1250.5,
        nextServiceType: 'A-Check',
        hoursUntilService: 24.5,
        airworthinessExpiry: '2025-06-30',
        insuranceExpiry: '2025-08-15',
        location: 'KPAO',
    },
    {
        id: 'N67890',
        companyId: 'skybound-aero',
        tailNumber: 'N67890',
        model: 'Piper PA-28 Cherokee',
        status: 'In Maintenance',
        hours: 850.2,
        nextServiceType: 'B-Check',
        hoursUntilService: 49.8,
        airworthinessExpiry: '2025-04-22',
        insuranceExpiry: '2025-09-01',
        location: 'KPAO',
    },
    {
        id: 'N54321',
        companyId: 'skybound-aero',
        tailNumber: 'N54321',
        model: 'Diamond DA40 Star',
        status: 'Booked',
        hours: 450.0,
        nextServiceType: 'A-Check',
        hoursUntilService: 45.0,
        airworthinessExpiry: '2025-11-10',
        insuranceExpiry: '2025-10-20',
        location: 'KPAO',
    },
    {
        id: 'N11223',
        companyId: 'skybound-aero',
        tailNumber: 'N11223',
        model: 'Cirrus SR22',
        status: 'Available',
        hours: 2200.8,
        nextServiceType: 'C-Check',
        hoursUntilService: 300.2,
        airworthinessExpiry: '2026-01-15',
        insuranceExpiry: '2025-07-01',
        location: 'KPAO',
    },
    {
        id: 'N44556',
        companyId: 'skybound-aero',
        tailNumber: 'N44556',
        model: 'Beechcraft G36 Bonanza',
        status: 'Available',
        hours: 1500.0,
        nextServiceType: 'A-Check',
        hoursUntilService: 50.0,
        airworthinessExpiry: '2025-09-01',
        insuranceExpiry: '2025-09-01',
        location: 'KPAO',
    }
];
export let userData: User[] = [];

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
export let checklistData: Checklist[] = [];
export let completedChecklistData: CompletedChecklist[] = [];
export let safetyReportData: SafetyReport[] = [];
export let riskRegisterData: Risk[] = [];
export let qualityAuditData: QualityAudit[] = [];
export let auditScheduleData: AuditScheduleItem[] = [];
export let auditChecklistData: AuditChecklist[] = [];
export let allAlerts: Alert[] = [];
export let companyData: Company[] = [];

// Functions to modify data are now handled by components writing to Firestore.
