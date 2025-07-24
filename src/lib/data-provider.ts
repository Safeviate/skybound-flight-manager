
'use client';

// This file is being kept for now to avoid breaking imports, but it no longer provides mock data.
// All data fetching is now handled directly by components from Firestore.
import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Checklist, Airport, SafetyReport, Risk, QualityAudit, AuditScheduleItem, AuditChecklist, Alert, CompletedChecklist, Company } from './types';

export const airportData: Airport[] = [];
export let aircraftData: Aircraft[] = [];
export let userData: User[] = [];
export let bookingData: Booking[] = [];
export const trainingExercisesData: string[] = [];
export let checklistData: Checklist[] = [
    {
    id: 'cl-master-pre-flight',
    companyId: 'sky-ventures-aviation',
    title: 'Pre-flight',
    category: 'Pre-Flight',
    items: [
      { id: 'item-1', text: 'Cockpit check', completed: false },
      { id: 'item-2', text: 'Walk-around', completed: false },
      { id: 'item-3', text: 'Fuel and oil levels', completed: false },
    ],
  },
  {
    id: 'cl-master-post-flight',
    companyId: 'sky-ventures-aviation',
    title: 'Post-flight',
    category: 'Post-Flight',
    items: [
      { id: 'item-1', text: 'Shutdown procedure', completed: false },
      { id: 'item-2', text: 'Secure aircraft', completed: false },
      { id: 'item-3', text: 'Report any snags', completed: false },
    ],
  },
  {
    id: 'cl-master-post-maintenance',
    companyId: 'sky-ventures-aviation',
    title: 'Post Maintenance',
    category: 'Post-Maintenance',
    items: [
      { id: 'item-1', text: 'Verify all work is complete', completed: false },
      { id: 'item-2', text: 'Check logbook entries', completed: false },
      { id: 'item-3', text: 'Perform engine run-up test', completed: false },
    ],
  },
  {
    id: 'cl-master-pre-maintenance',
    companyId: 'sky-ventures-aviation',
    title: 'Pre Maintenance',
    category: 'Pre-Flight',
    items: [
        { id: 'item-1', text: 'Review logbook for snags', completed: false },
        { id: 'item-2', text: 'Position aircraft in hangar', completed: false },
        { id: 'item-3', text: 'Disconnect battery', completed: false },
    ],
  },
];
export let completedChecklistData: CompletedChecklist[] = [];
export let safetyReportData: SafetyReport[] = [];
export let riskRegisterData: Risk[] = [];
export let qualityAuditData: QualityAudit[] = [];
export let auditScheduleData: AuditScheduleItem[] = [];
export let auditChecklistData: AuditChecklist[] = [];
export let allAlerts: Alert[] = [];
export let companyData: Company[] = [];

// Functions to modify data are now handled by components writing to Firestore.
