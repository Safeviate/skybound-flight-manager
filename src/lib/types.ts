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

export type Student = {
  id: string;
  name: string;
  instructor: string;
  flightHours: number;
  progress: number; // percentage
  medicalExpiry: string;
  licenseExpiry: string;
};

export type Permission = 'Safety Manager' | 'Quality Manager' | 'Flight Manager' | 'Fleet Manager' | 'User Manager';

export const ALL_PERMISSIONS: Permission[] = ['Safety Manager', 'Quality Manager', 'Flight Manager', 'Fleet Manager', 'User Manager'];

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
