

export type Airport = {
  id: string;
  name: string;
  coords: {
    lat: number;
    lon: number;
  };
};

export type Aircraft = {
  id: string;
  tailNumber: string;
  model: string;
  status: 'Available' | 'In Maintenance' | 'Booked';
  hours: number;
  nextServiceType: string;
  hoursUntilService: number;
  airworthinessExpiry: string;
  insuranceExpiry: string;
  location: string; // Airport ID
};

export type Endorsement = {
    id: string;
    name: string;
    dateAwarded: string;
    awardedBy: string;
};

export type TrainingLogEntry = {
  id:string;
  date: string;
  aircraft: string;
  flightDuration: number;
  instructorNotes: string;
  instructorName: string;
};

export type Permission =
  | 'Aircraft:View'
  | 'Aircraft:Edit'
  | 'Bookings:View'
  | 'Bookings:Edit'
  | 'Students:View'
  | 'Students:Edit'
  | 'Personnel:View'
  | 'Personnel:Edit'
  | 'Safety:View'
  | 'Safety:Edit'
  | 'Quality:View'
  | 'Quality:Edit'
  | 'Checklists:View'
  | 'Checklists:Edit'
  | 'Super User';

export const ALL_PERMISSIONS: Permission[] = [
    'Aircraft:View',
    'Aircraft:Edit',
    'Bookings:View',
    'Bookings:Edit',
    'Students:View',
    'Students:Edit',
    'Personnel:View',
    'Personnel:Edit',
    'Safety:View',
    'Safety:Edit',
    'Quality:View',
    'Quality:Edit',
    'Checklists:View',
    'Checklists:Edit',
    'Super User',
];

export type Role =
  | 'Accountable Manager'
  | 'Admin'
  | 'Aircraft Manager'
  | 'Chief Flight Instructor'
  | 'Driver'
  | 'Front Office'
  | 'Head Of Training'
  | 'HR Manager'
  | 'Instructor'
  | 'Maintenance'
  | 'Operations Manager'
  | 'Quality Manager'
  | 'Safety Manager'
  | 'Student';

export type User = {
    id: string;
    name: string;
    role: Role;
    email: string;
    phone: string;
    permissions?: Permission[];
    // Student-specific
    instructor?: string;
    flightHours?: number;
    progress?: number;
    status?: 'Active' | 'Archived';
    endorsements?: Endorsement[];
    trainingLogs?: TrainingLogEntry[];
    // Personnel-specific
    department?: string;
    medicalExpiry?: string;
    licenseExpiry?: string;
};

export type Booking = {
  id: string;
  date: string;
  time: string;
  aircraft: string;
  student: string;
  instructor: string;
  purpose: 'Training' | 'Maintenance' | 'Private';
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  isChecklistComplete?: boolean;
};

export type SafetyReportType = 'Flight Operations Report' | 'Ground Operations Report' | 'Occupational Report' | 'General Report';

export type SafetyReport = {
  id: string;
  reportNumber: string;
  date: string;
  submittedBy: string;
  details: string;
  status: 'Open' | 'Under Review' | 'Closed';
  type: SafetyReportType;
  aircraftInvolved?: string;
};

export type RiskLikelihood = 'Rare' | 'Unlikely' | 'Possible' | 'Likely' | 'Certain';
export type RiskSeverity = 'Insignificant' | 'Minor' | 'Moderate' | 'Major' | 'Catastrophic';
export type RiskStatus = 'Open' | 'Mitigated' | 'Closed';

export type Risk = {
  id: string;
  description: string;
  likelihood: RiskLikelihood;
  severity: RiskSeverity;
  riskScore: number;
  status: RiskStatus;
  mitigation: string;
  dateIdentified: string;
}

export type ChecklistItem = {
    id: string;
    text: string;
    completed: boolean;
};

export type Checklist = {
    id: string;
    title: string;
    category: 'Pre-Flight' | 'Post-Flight' | 'Maintenance';
    items: ChecklistItem[];
    aircraftId?: string;
};


const VIEW_ALL_PAGES: Permission[] = [
    'Aircraft:View',
    'Bookings:View',
    'Students:View',
    'Personnel:View',
    'Safety:View',
    'Quality:View',
    'Checklists:View',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    'Accountable Manager': ['Super User'],
    'Admin': ['Super User'],
    'Operations Manager': ['Super User'],
    'HR Manager': ['Super User'],
    'Safety Manager': [...VIEW_ALL_PAGES, 'Safety:Edit'],
    'Quality Manager': [...VIEW_ALL_PAGES, 'Quality:Edit'],
    'Aircraft Manager': [...VIEW_ALL_PAGES, 'Aircraft:Edit'],
    'Maintenance': [...VIEW_ALL_PAGES, 'Aircraft:Edit', 'Checklists:Edit'],
    'Chief Flight Instructor': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Personnel:View', 'Checklists:Edit'],
    'Head Of Training': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Personnel:View', 'Checklists:Edit'],
    'Instructor': [...VIEW_ALL_PAGES, 'Bookings:Edit', 'Students:View', 'Checklists:View'],
    'Front Office': [...VIEW_ALL_PAGES],
    'Student': ['Bookings:View', 'Aircraft:View'],
    'Driver': [],
};
