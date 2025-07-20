
import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Checklist, Airport, SafetyReport, Risk, QualityAudit, AuditScheduleItem, AuditChecklist } from './types';
import { getNextService } from './utils.tsx';

export const airportData: Airport[] = [
  { id: 'KPAO', name: 'Palo Alto Airport', coords: { lat: 37.4613, lon: -122.1148 } },
];

// Aircraft Data
const rawAircraftData = [
  { id: '1', tailNumber: 'N12345', model: 'Cessna 172 Skyhawk', status: 'Available', hours: 1250.5, airworthinessExpiry: '2025-05-20', insuranceExpiry: '2025-01-15', location: 'KPAO' },
  { id: '2', tailNumber: 'N54321', model: 'Piper PA-28 Archer', status: 'In Maintenance', hours: 850.2, airworthinessExpiry: '2024-09-10', insuranceExpiry: '2024-08-15', location: 'KPAO' },
  { id: '3', tailNumber: 'N67890', model: 'Diamond DA40 Star', status: 'Booked', hours: 475.8, airworthinessExpiry: '2024-06-01', insuranceExpiry: '2025-06-01', location: 'KPAO' },
  { id: '4', tailNumber: 'N11223', model: 'Cirrus SR22', status: 'Available', hours: 320.0, airworthinessExpiry: '2025-03-15', insuranceExpiry: '2025-05-20', location: 'KPAO' },
  { id: '5', tailNumber: 'N44556', model: 'Beechcraft G36 Bonanza', status: 'Available', hours: 2100.7, airworthinessExpiry: '2024-07-10', insuranceExpiry: '2024-05-01', location: 'KPAO' },
];

export const aircraftData: Aircraft[] = rawAircraftData.map(ac => {
    const nextService = getNextService(ac.hours);
    return {
        ...ac,
        nextServiceType: nextService.type,
        hoursUntilService: nextService.hoursUntil,
    }
});

const studentEndorsements: { [key: string]: Endorsement[] } = {
    's1': [
        { id: 'e1', name: 'Solo Flight', dateAwarded: '2024-07-10', awardedBy: 'Mike Ross' },
        { id: 'e2', name: 'Cross-Country', dateAwarded: '2024-08-01', awardedBy: 'Mike Ross' },
    ],
    's2': [
        { id: 'e3', name: 'Takeoffs and Landings', dateAwarded: '2024-06-20', awardedBy: 'Sarah Connor' },
    ],
    's3': [
        { id: 'e4', name: 'Solo Flight', dateAwarded: '2024-05-15', awardedBy: 'Mike Ross' },
        { id: 'e5', name: 'Cross-Country', dateAwarded: '2024-06-20', awardedBy: 'Mike Ross' },
        { id: 'e6', name: 'Instrument Procedures', dateAwarded: '2024-07-30', awardedBy: 'Mike Ross' },
    ],
    's4': [],
    's5': [
        { id: 'e7', name: 'Solo Flight', dateAwarded: '2024-08-05', awardedBy: 'Sarah Connor' },
    ],
};

const studentTrainingLogs: { [key: string]: TrainingLogEntry[] } = {
    's1': [
        { id: 'l1', date: '2024-08-10', aircraft: 'N12345', flightDuration: 1.5, instructorName: 'Mike Ross', instructorNotes: 'Excellent handling of slow flight and stalls. Needs to work on consistency during landings.' },
        { id: 'l2', date: '2024-08-12', aircraft: 'N12345', flightDuration: 1.2, instructorName: 'Mike Ross', instructorNotes: 'Practiced emergency procedures. Good situational awareness, but needs to be quicker on the checklists.' },
    ],
    's2': [
        { id: 'l3', date: '2024-08-11', aircraft: 'N67890', flightDuration: 1.8, instructorName: 'Sarah Connor', instructorNotes: 'First flight focusing on basic maneuvers. Very smooth on the controls.' },
    ],
    's3': [],
    's4': [],
    's5': [],
};


// Unified User Data
export const userData: User[] = [
    // Personnel
    { id: 'p1', name: 'Mike Ross', role: 'Chief Flight Instructor', department: 'Flight Operations', email: 'mike.ross@skybound.com', phone: '555-0101', medicalExpiry: '2025-10-10', licenseExpiry: '2026-01-15', permissions: [] },
    { id: 'p2', name: 'Sarah Connor', role: 'Instructor', department: 'Flight Operations', email: 'sarah.connor@skybound.com', phone: '555-0102', medicalExpiry: '2024-08-10', licenseExpiry: '2025-04-22', permissions: [] },
    { id: 'p3', name: 'Hank Hill', role: 'Maintenance', department: 'Maintenance', email: 'hank.hill@skybound.com', phone: '555-0103', medicalExpiry: '2025-12-01', licenseExpiry: '2025-12-01', permissions: [] },
    { id: 'p4', name: 'Laura Croft', role: 'Instructor', department: 'Flight Operations', email: 'laura.croft@skybound.com', phone: '555-0104', medicalExpiry: '2025-07-30', licenseExpiry: '2025-07-30', permissions: [] },
    { id: 'p5', name: 'Admin User', role: 'Admin', department: 'Management', email: 'admin@skybound.com', phone: '555-0100', medicalExpiry: '2099-01-01', licenseExpiry: '2099-01-01', permissions: [] },
    { id: 'p6', name: 'John Smith', role: 'Safety Manager', department: 'Management', email: 'john.smith@skybound.com', phone: '555-0105', medicalExpiry: '2099-01-01', licenseExpiry: '2099-01-01', permissions: [] },
    { id: 'p7', name: 'Jessica Jones', role: 'Quality Manager', department: 'Management', email: 'jessica.jones@skybound.com', phone: '555-0106', permissions: [] },
    // Students
    { id: 's1', name: 'John Doe', role: 'Student', email: 'john.doe@email.com', phone: '555-0201', instructor: 'Mike Ross', flightHours: 45.5, progress: 75, medicalExpiry: '2025-01-01', licenseExpiry: '2025-06-01', status: 'Active', endorsements: studentEndorsements['s1'], trainingLogs: studentTrainingLogs['s1'], permissions: [] },
    { id: 's2', name: 'Jane Smith', role: 'Student', email: 'jane.smith@email.com', phone: '555-0202', instructor: 'Sarah Connor', flightHours: 22.0, progress: 40, medicalExpiry: '2024-07-20', licenseExpiry: '2025-02-10', status: 'Active', endorsements: studentEndorsements['s2'], trainingLogs: studentTrainingLogs['s2'], permissions: [] },
    { id: 's3', name: 'Peter Jones', role: 'Student', email: 'peter.jones@email.com', phone: '555-0203', instructor: 'Mike Ross', flightHours: 60.2, progress: 90, medicalExpiry: '2025-11-10', licenseExpiry: '2025-08-20', status: 'Active', endorsements: studentEndorsements['s3'], trainingLogs: studentTrainingLogs['s3'], permissions: [] },
    { id: 's4', name: 'Emily White', role: 'Student', email: 'emily.white@email.com', phone: '555-0204', instructor: 'Laura Croft', flightHours: 10.5, progress: 20, medicalExpiry: '2026-03-01', licenseExpiry: '2024-08-01', status: 'Archived', endorsements: studentEndorsements['s4'], trainingLogs: studentTrainingLogs['s4'], permissions: [] },
    { id: 's5', name: 'Chris Green', role: 'Student', email: 'chris.green@email.com', phone: '555-0205', instructor: 'Sarah Connor', flightHours: 35.8, progress: 65, medicalExpiry: '2025-09-15', licenseExpiry: '2025-09-15', status: 'Active', endorsements: studentEndorsements['s5'], trainingLogs: studentTrainingLogs['s5'], permissions: [] },
];

// Booking Data
export const bookingData: Booking[] = [
  { id: '1', date: '2024-08-15', time: '14:00', aircraft: 'N12345', student: 'John Doe', instructor: 'Mike Ross', purpose: 'Training', status: 'Upcoming', isChecklistComplete: true },
  { id: '2', date: '2024-08-16', time: '09:00', aircraft: 'N54321', student: 'N/A', instructor: 'Hank Hill', purpose: 'Maintenance', status: 'Completed', isChecklistComplete: false },
  { id: '3', date: '2024-08-16', time: '11:00', aircraft: 'N67890', student: 'Jane Smith', instructor: 'Sarah Connor', purpose: 'Training', status: 'Upcoming', isChecklistComplete: false },
  { id: '4', date: '2024-08-17', time: '10:00', aircraft: 'N11223', student: 'Peter Jones', instructor: 'Mike Ross', purpose: 'Training', status: 'Upcoming', isChecklistComplete: false },
  { id: '5', date: '2024-08-17', time: '16:00', aircraft: 'N44556', student: 'N/A', instructor: 'N/A', purpose: 'Private', status: 'Upcoming', isChecklistComplete: false },
  { id: 'b1', date: '2024-08-10', time: '10:00', aircraft: 'N12345', student: 'John Doe', instructor: 'Mike Ross', purpose: 'Training', status: 'Completed', isChecklistComplete: true },
  { id: 'b2', date: '2024-08-12', time: '13:00', aircraft: 'N12345', student: 'John Doe', instructor: 'Mike Ross', purpose: 'Training', status: 'Completed', isChecklistComplete: true },
  { id: 'b3', date: '2024-08-11', time: '09:00', aircraft: 'N67890', student: 'Jane Smith', instructor: 'Sarah Connor', purpose: 'Training', status: 'Completed', isChecklistComplete: true },
  { id: 'b4', date: '2024-08-16', time: '14:00', aircraft: 'N12345', student: 'John Doe', instructor: 'Mike Ross', purpose: 'Training', status: 'Upcoming', isChecklistComplete: false },
];

// Training Exercises
export const trainingExercisesData: string[] = [
    "Takeoffs and Landings",
    "Slow Flight and Stalls",
    "Emergency Procedures",
    "Navigation and Cross-Country",
    "Instrument Procedures",
    "Maneuvers",
    "Solo Flight",
    "Checkride Preparation",
];

// Checklist Data
export const checklistData: Checklist[] = [
    {
        id: 'cl-1',
        title: 'Cessna 172 Pre-Flight Inspection',
        category: 'Pre-Flight',
        aircraftId: '1',
        items: [
            { id: 'cl-1-1', text: 'Certificate of Registration (C of R) on board', completed: false },
            { id: 'cl-1-2', text: 'Certificate of Airworthiness (C of A) on board', completed: false },
            { id: 'cl-1-3', text: 'Aircraft Radio Station Licence on board', completed: false },
            { id: 'cl-1-4', text: 'Proof of Insurance on board', completed: false },
            { id: 'cl-1-5', text: 'Aircraft Flight Manual (AFM) available', completed: false },
            { id: 'cl-1-6', text: 'Weight & Balance documents available', completed: false },
            { id: 'cl-1-7', text: 'Aircraft Journey Logbook on board', completed: false },
            { id: 'cl-1-8', text: 'Minimum Equipment List (MEL) available', completed: false },
            { id: 'cl-1-9', text: 'Fuselage & Empennage - Inspect for damage', completed: false },
            { id: 'cl-1-10', text: 'Wings & Control Surfaces - Check for damage, freedom of movement', completed: false },
            { id: 'cl-1-11', text: 'Nose & Propeller - Check oil, inspect propeller/spinner', completed: false },
            { id: 'cl-1-12', text: 'Fuel & Oil - Check quantities', completed: false },
        ]
    },
    {
        id: 'cl-2',
        title: 'Piper PA-28 Post-Flight Secure',
        category: 'Post-Flight',
        aircraftId: '2',
        items: [
            { id: 'cl-2-1', text: 'Avionics - All off', completed: false },
            { id: 'cl-2-2', text: 'Mixture - Idle cut-off', completed: false },
            { id: 'cl-2-3', text: 'Magnetos - Off', completed: false },
            { id: 'cl-2-4', text: 'Master Switch - Off', completed: false },
            { id: 'cl-2-5', text: 'Hobbs and Tach Time - Recorded', completed: false },
            { id: 'cl-2-6', text: 'Control Lock - Installed', completed: false },
            { id: 'cl-2-7', text: 'Aircraft - Chocked and tied down', completed: false },
        ]
    },
     {
        id: 'cl-3',
        title: '100-Hour Inspection',
        category: 'Maintenance',
        items: [
            { id: 'cl-3-1', text: 'Engine - Oil change, filter check', completed: false },
            { id: 'cl-3-2', text: 'Propeller - Inspect for nicks and security', completed: false },
            { id: 'cl-3-3', text: 'Landing Gear - Check tires, brakes, struts', completed: false },
            { id: 'cl-3-4', text: 'Control Systems - Inspect cables and pulleys', completed: false },
            { id: 'cl-3-5', text: 'Logbooks - Entry completed and signed', completed: false },
        ]
    },
];

// Safety and Risk Data
export const safetyReportData: SafetyReport[] = [
    { 
      id: 'sr1', 
      reportNumber: 'FOR-001', 
      heading: 'Possible Bird Strike on Final Approach', 
      occurrenceDate: '2024-08-10', 
      filedDate: '2024-08-10', 
      submittedBy: 'Sarah Connor', 
      type: 'Flight Operations Report', 
      department: 'Flight Operations',
      subCategory: 'Bird Strike', 
      phaseOfFlight: 'Approach',
      details: 'During final approach to runway 31, a large bird, possibly a hawk, passed very close to the aircraft. No impact was felt, but a post-flight inspection is warranted to be safe. ATC was notified of the bird activity in the area.', 
      status: 'Under Review', 
      aircraftInvolved: 'N/A', 
      location: 'KPAO',
      investigationTeam: ['Mike Ross', 'Sarah Connor', 'John Smith'],
      investigationNotes: 'Post-flight inspection of the aircraft revealed no visible damage. Interviewed Sarah Connor, who confirmed the bird passed within an estimated 50 feet of the cockpit. Air Traffic Control confirms they issued a general warning about bird activity that morning, but no specific advisory for this flight.', 
      occurrenceCategory: 'BIRD',
      discussion: [
        { id: 'd1', author: 'John Smith', recipient: 'Sarah Connor', message: 'Please provide a written statement detailing the event from your perspective, including altitude and airspeed at the time of the event.', datePosted: '2024-08-11T10:00:00Z', replyByDate: '2024-08-14T17:00:00Z' },
        { id: 'd2', author: 'Sarah Connor', recipient: 'John Smith', message: 'Statement submitted. We were at approximately 500 feet AGL, airspeed 70 knots. The bird came from the right side. It was a very close call.', datePosted: '2024-08-12T14:30:00Z' }
      ],
      associatedRisks: [
        { id: 'risk-sr1-1', hazard: 'Inadequate pilot briefing on bird activity in the area.', risk: 'Pilots may not be sufficiently vigilant, increasing the chance of a bird strike.', likelihood: 'Possible', severity: 'Minor', riskScore: 6, hazardArea: 'Flight Operations', process: 'Approach', promotedToRegister: true },
        { id: 'risk-sr1-2', hazard: 'Bird ingestion into engine during a critical phase of flight.', risk: 'Potential for engine failure on approach, leading to a loss of control.', likelihood: 'Rare', severity: 'Major', riskScore: 5, hazardArea: 'Flight Operations', process: 'Approach', promotedToRegister: true },
        { id: 'risk-sr1-3', hazard: 'Startle effect on pilot during a critical phase of flight.', risk: 'Sudden appearance of a large bird could cause an abrupt, inappropriate control input from the pilot, leading to an unstable approach.', likelihood: 'Unlikely', severity: 'Moderate', riskScore: 6, hazardArea: 'Flight Operations', process: 'Approach', promotedToRegister: false },
      ]
    },
    { id: 'sr2', reportNumber: 'FOR-002', heading: 'Unstable Approach and Hard Landing', occurrenceDate: '2024-08-12', filedDate: '2024-08-12', submittedBy: 'John Doe', type: 'Flight Operations Report', department: 'Flight Operations', subCategory: 'Unstable Approach', phaseOfFlight: 'Landing', details: 'Hard landing in N12345. Suspected ballooned landing, but aircraft seems undamaged. Recommending inspection.', status: 'Open', aircraftInvolved: 'N12345', location: 'KPAO', investigationTeam: ['John Doe'], occurrenceCategory: 'ARC' },
    { id: 'sr3', reportNumber: 'GOR-001', heading: 'Sticky Fuel Pump Handle', occurrenceDate: '2024-07-28', filedDate: '2024-07-29', submittedBy: 'Hank Hill', type: 'Ground Operations Report', department: 'Ground Operation', phaseOfFlight: 'Servicing', details: 'Fuel pump handle in self-serve area is sticky and sometimes fails to shut off cleanly, causing minor spillage.', status: 'Closed', aircraftInvolved: 'N/A', location: 'KPAO', investigationTeam: [], occurrenceCategory: 'RAMP' },
    { id: 'sr4', reportNumber: 'GR-001', heading: 'Hangar Door Grinding Noise', occurrenceDate: '2024-08-14', filedDate: '2024-08-15', submittedBy: 'Anonymous', type: 'General Report', department: 'Management', phaseOfFlight: 'Maintenance', details: 'Hangar door mechanism seems to be grinding and is difficult to open. May require servicing.', status: 'Open', aircraftInvolved: 'N/A', location: 'KPAO', investigationTeam: [], occurrenceCategory: 'ADRM' },
    { id: 'sr5', reportNumber: 'ADR-001', heading: 'Hydraulic Fluid Leak on Landing Gear', occurrenceDate: '2024-08-16', filedDate: '2024-08-16', submittedBy: 'Hank Hill', type: 'Aircraft Defect Report', department: 'Maintenance', phaseOfFlight: 'Parked', details: 'Landing gear strut on N54321 appears to be leaking hydraulic fluid.', status: 'Open', aircraftInvolved: 'N54321', location: 'KPAO', investigationTeam: ['Hank Hill'], occurrenceCategory: 'SCF-NP' },
    { id: 'sr6', reportNumber: 'FOR-003', heading: 'Another Unstable Approach', occurrenceDate: '2024-07-15', filedDate: '2024-07-15', submittedBy: 'Sarah Connor', type: 'Flight Operations Report', department: 'Flight Operations', subCategory: 'Unstable Approach', phaseOfFlight: 'Approach', details: 'Student initiated go-around due to unstable approach. Good decision making.', status: 'Closed', aircraftInvolved: 'N67890', location: 'KPAO', investigationTeam: [], occurrenceCategory: 'ARC' },
    { id: 'sr7', reportNumber: 'ADR-002', heading: 'ELT Activated Erroneously', occurrenceDate: '2024-07-22', filedDate: '2024-07-22', submittedBy: 'Mike Ross', type: 'Aircraft Defect Report', department: 'Maintenance', phaseOfFlight: 'Post-flight', details: 'The Emergency Locator Transmitter (ELT) on N11223 activated on its own after shutdown. Required manual deactivation.', status: 'Closed', aircraftInvolved: 'N11223', location: 'KPAO', investigationTeam: [], occurrenceCategory: 'SCF-NP' },
];

export const riskRegisterData: Risk[] = safetyReportData
    .flatMap(report => 
        (report.associatedRisks || [])
        .filter(risk => risk.promotedToRegister)
        .map(risk => ({
            id: `risk-reg-${risk.id}`,
            hazard: risk.hazard,
            risk: risk.risk,
            consequences: ['Aircraft damage', 'Injury'], // Example data
            likelihood: risk.likelihood,
            severity: risk.severity,
            riskScore: risk.riskScore,
            status: 'Open',
            mitigation: '',
            dateIdentified: report.filedDate,
            hazardArea: risk.hazardArea,
            process: risk.process,
            reportNumber: report.reportNumber,
            riskOwner: 'John Smith',
            reviewDate: '2025-02-11',
        }))
    );

export const qualityAuditData: QualityAudit[] = [
    {
        id: 'QA-001',
        date: '2024-07-20',
        type: 'Internal',
        auditor: 'Jessica Jones',
        area: 'Flight Operations',
        status: 'With Findings',
        complianceScore: 92,
        nonConformanceIssues: [
            { id: 'nci-1', category: 'Documentation', description: 'Incomplete journey logbook entries for two aircraft.' },
            { id: 'nci-2', category: 'Procedural', description: 'One pre-flight checklist was signed but not dated.' },
        ],
        summary: 'Overall compliance is good, but attention to detail in record-keeping needs improvement. Corrective actions issued for documentation procedures.'
    },
    {
        id: 'QA-002',
        date: '2024-06-15',
        type: 'External',
        auditor: 'FAA',
        area: 'Maintenance',
        status: 'Compliant',
        complianceScore: 98,
        nonConformanceIssues: [],
        summary: 'The maintenance department demonstrated excellent adherence to all regulatory requirements and best practices. No findings.'
    },
    {
        id: 'QA-003',
        date: '2024-05-30',
        type: 'Internal',
        auditor: 'Jessica Jones',
        area: 'Ground Ops',
        status: 'With Findings',
        complianceScore: 88,
        nonConformanceIssues: [
            { id: 'nci-3', category: 'Equipment', description: 'One fire extinguisher in the hangar was found to be past its inspection date.' },
            { id: 'nci-4', category: 'Training', description: 'Records for recurrent training on fueling procedures for one staff member could not be located.' },
            { id: 'nci-5', category: 'Procedural', description: 'Aircraft chocking procedures were not consistently followed.' },
        ],
        summary: 'Several non-conformance issues were identified, primarily related to equipment checks and procedural adherence. Corrective actions have been assigned.'
    },
    {
        id: 'QA-004',
        date: '2024-04-10',
        type: 'Internal',
        auditor: 'Jessica Jones',
        area: 'Flight Operations',
        status: 'Compliant',
        complianceScore: 96,
        nonConformanceIssues: [
             { id: 'nci-6', category: 'Documentation', description: 'Minor inconsistencies found in student training records.' },
        ],
        summary: 'The audit confirmed a high level of compliance with training standards. A minor finding in documentation was noted and has been corrected.'
    }
];

export const auditScheduleData: AuditScheduleItem[] = [
  { id: 'sch-1', area: 'Flight Operations', year: new Date().getFullYear(), quarter: 'Q1', status: 'Completed' },
  { id: 'sch-2', area: 'Maintenance', year: new Date().getFullYear(), quarter: 'Q1', status: 'Completed' },
  { id: 'sch-3', area: 'Ground Ops', year: new Date().getFullYear(), quarter: 'Q2', status: 'Scheduled' },
  { id: 'sch-4', area: 'Management', year: new Date().getFullYear(), quarter: 'Q2', status: 'Pending' },
  { id: 'sch-5', area: 'Flight Operations', year: new Date().getFullYear(), quarter: 'Q3', status: 'Scheduled' },
  { id: 'sch-6', area: 'Safety Systems', year: new Date().getFullYear(), quarter: 'Q3', status: 'Scheduled' },
  { id: 'sch-7', area: 'External (FAA)', year: new Date().getFullYear(), quarter: 'Q4', status: 'Pending' },
];

export const auditChecklistData: AuditChecklist[] = [
    {
        id: 'saccaa-01',
        title: 'Personnel & Licensing Audit',
        area: 'Personnel',
        items: [
            { id: 'p-1', text: 'Is the Chief Flight Instructor (CFI) properly nominated and approved?', isCompliant: null, notes: '' },
            { id: 'p-2', text: 'Do all Flight Instructors hold valid licenses and ratings for the courses taught?', isCompliant: null, notes: '' },
            { id: 'p-3', text: 'Are instructor medical certificates valid and current?', isCompliant: null, notes: '' },
            { id: 'p-4', text: 'Is there a record of instructor standardisation and proficiency checks?', isCompliant: null, notes: '' },
            { id: 'p-5', text: 'Are instructor-to-student ratios compliant with regulations?', isCompliant: null, notes: '' },
        ]
    },
    {
        id: 'saccaa-02',
        title: 'Aircraft & Maintenance Records Audit',
        area: 'Maintenance',
        items: [
            { id: 'am-1', text: 'Does each training aircraft have a valid Certificate of Airworthiness?', isCompliant: null, notes: '' },
            { id: 'am-2', text: 'Are aircraft maintenance programs approved and up-to-date?', isCompliant: null, notes: '' },
            { id: 'am-3', text: 'Are all required inspections (e.g., 100-hour, annual) documented and current?', isCompliant: null, notes: '' },
            { id: 'am-4', text: 'Is the Aircraft Journey Logbook being completed correctly for every flight?', isCompliant: null, notes: '' },
            { id: 'am-5', text: 'Is all required emergency and survival equipment on board and serviceable?', isCompliant: null, notes: '' },
        ]
    },
    {
        id: 'saccaa-03',
        title: 'Training & Procedures Manual (TPM) Audit',
        area: 'Management',
        items: [
            { id: 'tpm-1', text: 'Is the TPM approved by the SACAA?', isCompliant: null, notes: '' },
            { id: 'tpm-2', text: 'Is the TPM readily available to all relevant personnel?', isCompliant: null, notes: '' },
            { id: 'tpm-3', text: 'Does the TPM accurately describe the courses offered?', isCompliant: null, notes: '' },
            { id: 'tpm-4', text: 'Are the syllabi, lesson plans, and grading criteria defined as per regulations?', isCompliant: null, notes: '' },
            { id: 'tpm-5', text: 'Is there a system for amending and distributing updates to the TPM?', isCompliant: null, notes: '' },
        ]
    },
     {
        id: 'saccaa-04',
        title: 'Student Records & Progress Audit',
        area: 'Records',
        items: [
            { id: 'sr-1', text: 'Is there a complete and orderly file for each enrolled student?', isCompliant: null, notes: '' },
            { id: 'sr-2', text: 'Do student files contain copies of medical certificates and pilot licenses (if any)?', isCompliant: null, notes: '' },
            { id: 'sr-3', text: 'Are flight training hours, ground school hours, and simulator hours logged accurately?', isCompliant: null, notes: '' },
            { id: 'sr-4', text: 'Are student progress tests and examination results properly recorded?', isCompliant: null, notes: '' },
            { id: 'sr-5', text: 'Is there evidence of regular review of student progress by the CFI?', isCompliant: null, notes: '' },
        ]
    },
    {
        id: 'saccaa-05',
        title: 'Facilities & Equipment Audit',
        area: 'Facilities',
        items: [
            { id: 'fe-1', text: 'Are the main base of operations and any satellite bases approved?', isCompliant: null, notes: '' },
            { id: 'fe-2', text: 'Are briefing rooms adequate in size and properly equipped (e.g., whiteboards, models)?', isCompliant: null, notes: '' },
            { id: 'fe-3', text: 'Is there a suitable library with up-to-date regulations, charts, and manuals?', isCompliant: null, notes: '' },
            { id: 'fe-4', text: 'Are flight simulators (if used) approved and serviceable?', isCompliant: null, notes: '' },
            { id: 'fe-5', text: 'Are security and access control measures for facilities and aircraft appropriate?', isCompliant: null, notes: '' },
        ]
    }
];
