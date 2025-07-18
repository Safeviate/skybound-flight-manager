
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
};

export type Endorsement = {
    id: string;
    name: string;
    dateAwarded: string;
    awardedBy: string;
};

export type Student = {
  id: string;
  name: string;
  instructor: string;
  flightHours: number;
  progress: number; // percentage
  medicalExpiry: string;
  licenseExpiry: string;
  endorsements: Endorsement[];
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

export type Personnel = {
  id: string;
  name: string;
  role: Role;
  department: string;
  email: string;
  phone: string;
  medicalExpiry: string;
  licenseExpiry: string;
  permissions: Permission[];
};

export type Booking = {
  id: string;
  date: string;
  time: string;
  aircraft: string;
  student: string;
  instructor: string;
  purpose: 'Training' | 'Maintenance' | 'Private';
};

export type SafetyReport = {
  id: string;
  date: string;
  submittedBy: string;
  details: string;
  status: 'Open' | 'Under Review' | 'Closed';
};

const VIEW_ALL_PAGES: Permission[] = [
    'Aircraft:View',
    'Bookings:View',
    'Students:View',
    'Personnel:View',
    'Safety:View',
    'Quality:View',
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    'Accountable Manager': ['Super User'],
    'Admin': ['Super User'],
    'Operations Manager': ['Super User'],
    'HR Manager': ['Super User'],

    'Safety Manager': [...VIEW_ALL_PAGES, 'Safety:Edit'],
    'Quality Manager': [...VIEW_ALL_PAGES, 'Quality:Edit'],
    'Aircraft Manager': [...VIEW_ALL_PAGES, 'Aircraft:Edit'],
    'Maintenance': [...VIEW_ALL_PAGES, 'Aircraft:Edit'],
    
    'Chief Flight Instructor': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Personnel:View'],
    'Head Of Training': [...VIEW_ALL_PAGES, 'Students:Edit', 'Bookings:Edit', 'Personnel:View'],
    'Instructor': [...VIEW_ALL_PAGES, 'Bookings:Edit', 'Students:View'],
    
    'Front Office': [...VIEW_ALL_PAGES],
    'Student': ['Bookings:View'],
    'Driver': [],
};
