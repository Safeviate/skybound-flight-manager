
import type { Aircraft, Student, Personnel, Booking, Endorsement, TrainingLogEntry, Checklist } from './types';
import { getNextService } from './utils.tsx';

// Aircraft Data
const rawAircraftData = [
  { id: '1', tailNumber: 'N12345', model: 'Cessna 172 Skyhawk', status: 'Available', hours: 1250.5, airworthinessExpiry: '2025-05-20', insuranceExpiry: '2025-01-15' },
  { id: '2', tailNumber: 'N54321', model: 'Piper PA-28 Archer', status: 'In Maintenance', hours: 850.2, airworthinessExpiry: '2024-09-10', insuranceExpiry: '2024-08-15' },
  { id: '3', tailNumber: 'N67890', model: 'Diamond DA40 Star', status: 'Booked', hours: 475.8, airworthinessExpiry: '2024-06-01', insuranceExpiry: '2025-06-01' },
  { id: '4', tailNumber: 'N11223', model: 'Cirrus SR22', status: 'Available', hours: 320.0, airworthinessExpiry: '2025-03-15', insuranceExpiry: '2025-05-20' },
  { id: '5', tailNumber: 'N44556', model: 'Beechcraft G36 Bonanza', status: 'Available', hours: 2100.7, airworthinessExpiry: '2024-07-10', insuranceExpiry: '2024-05-01' },
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
    '1': [
        { id: 'e1', name: 'Solo Flight', dateAwarded: '2024-07-10', awardedBy: 'Mike Ross' },
        { id: 'e2', name: 'Cross-Country', dateAwarded: '2024-08-01', awardedBy: 'Mike Ross' },
    ],
    '2': [
        { id: 'e3', name: 'Takeoffs and Landings', dateAwarded: '2024-06-20', awardedBy: 'Sarah Connor' },
    ],
    '3': [
        { id: 'e4', name: 'Solo Flight', dateAwarded: '2024-05-15', awardedBy: 'Mike Ross' },
        { id: 'e5', name: 'Cross-Country', dateAwarded: '2024-06-20', awardedBy: 'Mike Ross' },
        { id: 'e6', name: 'Instrument Procedures', dateAwarded: '2024-07-30', awardedBy: 'Mike Ross' },
    ],
    '4': [],
    '5': [
        { id: 'e7', name: 'Solo Flight', dateAwarded: '2024-08-05', awardedBy: 'Sarah Connor' },
    ],
};

const studentTrainingLogs: { [key: string]: TrainingLogEntry[] } = {
    '1': [
        { id: 'l1', date: '2024-08-10', aircraft: 'N12345', flightDuration: 1.5, instructorName: 'Mike Ross', instructorNotes: 'Excellent handling of slow flight and stalls. Needs to work on consistency during landings.' },
        { id: 'l2', date: '2024-08-12', aircraft: 'N12345', flightDuration: 1.2, instructorName: 'Mike Ross', instructorNotes: 'Practiced emergency procedures. Good situational awareness, but needs to be quicker on the checklists.' },
    ],
    '2': [
        { id: 'l3', date: '2024-08-11', aircraft: 'N67890', flightDuration: 1.8, instructorName: 'Sarah Connor', instructorNotes: 'First flight focusing on basic maneuvers. Very smooth on the controls.' },
    ],
    '3': [],
    '4': [],
    '5': [],
};


// Student Data
export const studentData: Student[] = [
  { id: '1', name: 'John Doe', instructor: 'Mike Ross', flightHours: 45.5, progress: 75, medicalExpiry: '2025-01-01', licenseExpiry: '2025-06-01', status: 'Active', endorsements: studentEndorsements['1'], trainingLogs: studentTrainingLogs['1'] },
  { id: '2', name: 'Jane Smith', instructor: 'Sarah Connor', flightHours: 22.0, progress: 40, medicalExpiry: '2024-07-20', licenseExpiry: '2025-02-10', status: 'Active', endorsements: studentEndorsements['2'], trainingLogs: studentTrainingLogs['2'] },
  { id: '3', name: 'Peter Jones', instructor: 'Mike Ross', flightHours: 60.2, progress: 90, medicalExpiry: '2025-11-10', licenseExpiry: '2025-08-20', status: 'Active', endorsements: studentEndorsements['3'], trainingLogs: studentTrainingLogs['3'] },
  { id: '4', name: 'Emily White', instructor: 'Laura Croft', flightHours: 10.5, progress: 20, medicalExpiry: '2026-03-01', licenseExpiry: '2024-08-01', status: 'Archived', endorsements: studentEndorsements['4'], trainingLogs: studentTrainingLogs['4'] },
  { id: '5', name: 'Chris Green', instructor: 'Sarah Connor', flightHours: 35.8, progress: 65, medicalExpiry: '2025-09-15', licenseExpiry: '2025-09-15', status: 'Active', endorsements: studentEndorsements['5'], trainingLogs: studentTrainingLogs['5'] },
];

// Personnel Data
export const personnelData: Personnel[] = [
  { id: '1', name: 'Mike Ross', role: 'Chief Flight Instructor', department: 'Flight Operations', email: 'mike.ross@skybound.com', phone: '555-0101', medicalExpiry: '2025-10-10', licenseExpiry: '2026-01-15', permissions: ['Students:Edit', 'Bookings:Edit', 'Checklists:Edit'] },
  { id: '2', name: 'Sarah Connor', role: 'Instructor', department: 'Flight Operations', email: 'sarah.connor@skybound.com', phone: '555-0102', medicalExpiry: '2024-08-10', licenseExpiry: '2025-04-22', permissions: ['Students:View', 'Bookings:Edit', 'Checklists:View'] },
  { id: '3', name: 'Hank Hill', role: 'Maintenance', department: 'Maintenance', email: 'hank.hill@skybound.com', phone: '555-0103', medicalExpiry: '2025-12-01', licenseExpiry: '2025-12-01', permissions: ['Aircraft:Edit', 'Checklists:Edit'] },
  { id: '4', name: 'Laura Croft', role: 'Instructor', department: 'Flight Operations', email: 'laura.croft@skybound.com', phone: '555-0104', medicalExpiry: '2025-07-30', licenseExpiry: '2025-07-30', permissions: ['Students:View', 'Bookings:View', 'Checklists:View'] },
  { id: '5', name: 'Admin User', role: 'Admin', department: 'Management', email: 'admin@skybound.com', phone: '555-0100', medicalExpiry: '2099-01-01', licenseExpiry: '2099-01-01', permissions: ['Super User'] },
];

// Booking Data
export const bookingData: Booking[] = [
  { id: '1', date: '2024-08-15', time: '14:00', aircraft: 'N12345', student: 'John Doe', instructor: 'Mike Ross', purpose: 'Training', status: 'Completed' },
  { id: '2', date: '2024-08-16', time: '09:00', aircraft: 'N54321', student: 'N/A', instructor: 'Hank Hill', purpose: 'Maintenance', status: 'Completed' },
  { id: '3', date: '2024-08-16', time: '11:00', aircraft: 'N67890', student: 'Jane Smith', instructor: 'Sarah Connor', purpose: 'Training', status: 'Upcoming' },
  { id: '4', date: '2024-08-17', time: '10:00', aircraft: 'N11223', student: 'Peter Jones', instructor: 'Mike Ross', purpose: 'Training', status: 'Upcoming' },
  { id: '5', date: '2024-08-17', time: '16:00', aircraft: 'N44556', student: 'N/A', instructor: 'N/A', purpose: 'Private', status: 'Upcoming' },
  { id: 'b1', date: '2024-08-10', time: '10:00', aircraft: 'N12345', student: 'John Doe', instructor: 'Mike Ross', purpose: 'Training', status: 'Completed' },
  { id: 'b2', date: '2024-08-12', time: '13:00', aircraft: 'N12345', student: 'John Doe', instructor: 'Mike Ross', purpose: 'Training', status: 'Completed' },
  { id: 'b3', date: '2024-08-11', time: '09:00', aircraft: 'N67890', student: 'Jane Smith', instructor: 'Sarah Connor', purpose: 'Training', status: 'Completed' },
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
        items: [
            { id: 'cl-1-1', text: 'Cabin - Documents (ARROW)', completed: false },
            { id: 'cl-1-2', text: 'Fuselage (Left Side) - Check for damage', completed: false },
            { id: 'cl-1-3', text: 'Empennage - Control surfaces free and correct', completed: false },
            { id: 'cl-1-4', text: 'Right Wing - Aileron and flap check', completed: false },
            { id: 'cl-1-5', text: 'Nose - Oil level, propeller, and spinner', completed: false },
            { id: 'cl-1-6', text: 'Left Wing - Fuel quantity, pitot tube', completed: false },
        ]
    },
    {
        id: 'cl-2',
        title: 'Piper PA-28 Post-Flight Secure',
        category: 'Post-Flight',
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
