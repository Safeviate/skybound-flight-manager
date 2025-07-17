export type Aircraft = {
  id: string;
  tailNumber: string;
  model: string;
  status: 'Available' | 'In Maintenance' | 'Booked';
  hours: number;
};

export type Student = {
  id: string;
  name: string;
  instructor: string;
  flightHours: number;
  progress: number; // percentage
};

export type Personnel = {
  id: string;
  name: string;
  role: 'Instructor' | 'Maintenance' | 'Admin';
  email: string;
  phone: string;
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
