
'use client';

// This file is being kept for now to avoid breaking imports, but it no longer provides mock data.
// All data fetching is now handled directly by components from Firestore.
import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Checklist, Airport, SafetyReport, Risk, QualityAudit, AuditScheduleItem, AuditChecklist, Alert, CompletedChecklist, Company, ComplianceItem, RiskLikelihood, RiskSeverity } from './types';

export const airportData: Airport[] = [];
export const aircraftData: Aircraft[] = [];
export let userData: Omit<User, 'id'>[] = [];
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

export const likelihoodValues: RiskLikelihood[] = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Certain'];
export const severityValues: RiskSeverity[] = ['Insignificant', 'Minor', 'Moderate', 'Major', 'Catastrophic'];

export const complianceData: Omit<ComplianceItem, 'id'|'companyId'|'lastAuditDate'|'nextAuditDate'|'findings'>[] = [
    // Part 141 - Subpart 2: Certification
    {
        regulation: 'CAR 141.02.2',
        process: 'Procedure for initial application and renewal of ATO certificate is documented in the Training and Procedures Manual (TPM), Section 1. All applications are reviewed and submitted by the Accountable Manager.',
        responsibleManager: 'Accountable Manager',
    },
    {
        regulation: 'CAR 141.02.4',
        process: 'The scope of training operations is clearly defined in the ATO certificate and Operations Specification (OpSpec). All courses offered are within this approved scope. Any changes require formal application to SACAA.',
        responsibleManager: 'Head Of Training',
    },
    // Part 141 - Subpart 3: Personnel
    {
        regulation: 'CAR 141.03.2',
        process: 'The Accountable Manager is formally appointed via form SM-01. Responsibilities and authority are defined in the TPM, ensuring financial and operational control.',
        responsibleManager: 'Accountable Manager',
    },
    {
        regulation: 'CAR 141.03.3',
        process: 'Key personnel (HOT, CFI, QM, SM) are nominated and approved by SACAA. Job descriptions, qualifications, and experience requirements are maintained by the HR Manager. Any changes in key personnel are notified to SACAA within 7 days.',
        responsibleManager: 'HR Manager',
    },
    {
        regulation: 'CAR 141.03.5',
        process: 'All instructors undergo initial and recurrent standardization training as per TPM Section 4. Records of standardization are maintained by the Chief Flight Instructor and reviewed annually.',
        responsibleManager: 'Chief Flight Instructor',
    },
    // Part 141 - Subpart 4: Training and Procedures Manual (TPM)
    {
        regulation: 'CAR 141.04.1',
        process: 'The Training and Procedures Manual (TPM) is established and maintained, detailing all aspects of training and operations. The TPM is reviewed annually by the Head of Training.',
        responsibleManager: 'Head Of Training',
    },
    {
        regulation: 'CAR 141.04.2',
        process: 'All amendments to the TPM are controlled through a formal document control process (QMS-DOC-01), reviewed by the Quality Manager, and approved by the SACAA before implementation.',
        responsibleManager: 'Quality Manager',
    },
    // Part 141 - Subpart 5: Facilities, Equipment, and Material
    {
        regulation: 'CAR 141.05.1',
        process: 'All facilities (briefing rooms, classrooms, offices) are maintained to a standard that ensures a safe and effective learning environment. Weekly inspections are conducted by the Operations Manager.',
        responsibleManager: 'Operations Manager',
    },
    {
        regulation: 'CAR 141.05.3',
        process: 'Training material for all courses is reviewed and updated annually by the Head of Training to ensure it is current and relevant to the syllabus.',
        responsibleManager: 'Head Of Training',
    },
     // Part 141 - Subpart 6: Aircraft and Simulators
    {
        regulation: 'CAR 141.06.1',
        process: 'The ATO has exclusive use of its fleet of aircraft as listed in the OpsSpec. Aircraft are managed and maintained by the approved AMO as per procedure MAINT-001.',
        responsibleManager: 'Aircraft Manager',
    },
    // Part 141 - Subpart 7: Records
    {
        regulation: 'CAR 141.07.1',
        process: 'Student training records, including flight hours, grades, and endorsements, are maintained securely. Digital records are backed up daily. Records are retained for a minimum of 5 years after training completion.',
        responsibleManager: 'Chief Flight Instructor',
    },
    {
        regulation: 'CAR 141.07.2',
        process: 'Personnel records, including licenses, medicals, and training, are maintained by the HR Manager. An expiry-tracking system is used to ensure all qualifications remain current.',
        responsibleManager: 'HR Manager',
    },
     // Part 141 - Subpart 8: Quality and Safety Management
    {
        regulation: 'CAR 141.08.1',
        process: 'A Safety Management System (SMS) and Quality Management System (QMS) are established and maintained as per the respective manuals. The systems are integrated to ensure continuous improvement.',
        responsibleManager: 'Quality Manager',
    },
    {
        regulation: 'CAR 141.08.2',
        process: 'A Safety Management System (SMS) and Quality Management System (QMS) are established and maintained as per the respective manuals. The systems are integrated to ensure continuous improvement.',
        responsibleManager: 'Safety Manager',
    },
    {
        regulation: 'CAR 141.08.4',
        process: 'The internal audit plan is managed by the Quality Manager. Audits are conducted quarterly for high-risk areas and annually for others, as defined in the Audit Schedule.',
        responsibleManager: 'Quality Manager',
    }
].sort((a, b) => {
    const partsA = a.regulation.replace('CAR ', '').split('.').map(Number);
    const partsB = b.regulation.replace('CAR ', '').split('.').map(Number);
    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
        const valA = partsA[i] || 0;
        const valB = partsB[i] || 0;
        if (valA !== valB) {
            return valA - valB;
        }
    }
    return 0;
});
