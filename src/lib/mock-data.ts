

import type { Aircraft, User, Booking, Endorsement, TrainingLogEntry, Checklist, Airport, SafetyReport, Risk } from './types';
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
    { id: 'sr1', reportNumber: 'FOR-001', occurrenceDate: '2024-08-10', filedDate: '2024-08-10', submittedBy: 'Sarah Connor', type: 'Flight Operations Report', subCategory: 'Bird Strike', details: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.', status: 'Under Review', aircraftInvolved: 'N/A' },
    { id: 'sr2', reportNumber: 'FOR-002', occurrenceDate: '2024-08-12', filedDate: '2024-08-12', submittedBy: 'John Doe', type: 'Flight Operations Report', subCategory: 'Unstable Approach', details: 'Hard landing in N12345. Suspected ballooned landing, but aircraft seems undamaged. Recommending inspection.', status: 'Open', aircraftInvolved: 'N12345' },
    { id: 'sr3', reportNumber: 'GOR-001', occurrenceDate: '2024-07-28', filedDate: '2024-07-29', submittedBy: 'Hank Hill', type: 'Ground Operations Report', details: 'Fuel pump handle in self-serve area is sticky and sometimes fails to shut off cleanly, causing minor spillage.', status: 'Closed', aircraftInvolved: 'N/A' },
    { id: 'sr4', reportNumber: 'GR-001', occurrenceDate: '2024-08-14', filedDate: '2024-08-15', submittedBy: 'Anonymous', type: 'General Report', details: 'Hangar door mechanism seems to be grinding and is difficult to open. May require servicing.', status: 'Open', aircraftInvolved: 'N/A' },
    { id: 'sr5', reportNumber: 'ADR-001', occurrenceDate: '2024-08-16', filedDate: '2024-08-16', submittedBy: 'Hank Hill', type: 'Aircraft Defect Report', details: 'Landing gear strut on N54321 appears to be leaking hydraulic fluid.', status: 'Open', aircraftInvolved: 'N54321' },
];

export const riskRegisterData: Risk[] = [
    { id: 'risk1', dateIdentified: '2024-08-10', description: 'Bird strike on approach/departure path', likelihood: 'Possible', severity: 'Major', riskScore: 16, status: 'Open', mitigation: 'Review bird dispersal procedures with airport operations. Advise pilots to increase vigilance.' },
    { id: 'risk2', dateIdentified: '2024-08-12', description: 'Student hard landings leading to aircraft damage', likelihood: 'Possible', severity: 'Moderate', riskScore: 12, status: 'Open', mitigation: 'Review landing training syllabus. Emphasize go-around procedure for unstable approaches.' },
    { id: 'risk3', dateIdentified: '2024-07-28', description: 'Fuel spillage at self-serve pumps', likelihood: 'Unlikely', severity: 'Minor', riskScore: 5, status: 'Mitigated', mitigation: 'Faulty fuel pump handle replaced on 2024-07-29. Monitoring for further issues.' },
    { id: 'risk4', dateIdentified: '2024-06-15', description: 'Runway incursion due to pilot error', likelihood: 'Rare', severity: 'Catastrophic', riskScore: 20, status: 'Open', mitigation: 'Mandatory training on airport signage and communication protocols. Review of hotspot map during pre-flight briefings.' },
];
