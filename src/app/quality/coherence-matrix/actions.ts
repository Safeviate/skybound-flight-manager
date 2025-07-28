
'use client';

// This file is being kept for now to avoid breaking imports, but it no longer provides mock data.
// All data fetching is now handled directly by components from Firestore.
import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Checklist, Airport, SafetyReport, Risk, QualityAudit, AuditScheduleItem, AuditChecklist, Alert, CompletedChecklist, Company, ComplianceItem } from './types';
import { ROLE_PERMISSIONS } from './types';

export const airportData: Airport[] = [];
export let aircraftData: Aircraft[] = [];
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
export const complianceData: Omit<ComplianceItem, 'id'|'companyId'>[] = [
    {
        regulation: 'CAR 121.03.5 (1)',
        process: 'A copy of the Operations Manual is maintained and provided to all relevant personnel. Document control is managed via the Q-Pulse system, procedure QP-DOC-001.',
        responsibleManager: 'Operations Manager',
        lastAuditDate: '2024-05-20',
        nextAuditDate: '2025-05-20',
        findings: 'None'
    },
    {
        regulation: 'CAR 91.07.1 (2)',
        process: 'All aircraft are equipped with a valid Certificate of Airworthiness. Originals are kept at Head Office, copies are onboard. Checked during pre-flight (Form F-001) and weekly by the Aircraft Manager.',
        responsibleManager: 'Aircraft Manager',
        lastAuditDate: '2024-06-15',
        nextAuditDate: '2025-06-15',
        findings: 'NCR-002 (Resolved)'
    },
    {
        regulation: 'CATS 139.01.1',
        process: 'Facility inspections of the hangar and apron areas are conducted weekly by the Ground Ops Manager using checklist G-CHK-003. Findings are logged in the Safety System.',
        responsibleManager: 'Ground Ops Manager',
        lastAuditDate: '2024-07-01',
        nextAuditDate: '2024-10-01',
        findings: 'None'
    }
];

// Functions to modify data are now handled by components writing to Firestore.
```
  </change>
  <change>
    <file>/src/app/quality/coherence-matrix/actions.ts</file>
    <content><