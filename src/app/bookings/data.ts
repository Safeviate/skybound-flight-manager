
import type { Aircraft, Booking } from '@/lib/types';
import { format, addDays, setHours } from 'date-fns';

const today = new Date();

export const aircraftData: Aircraft[] = [
    { id: '1', tailNumber: 'ZS-ABC', make: 'Cessna', model: '172', companyId: 'skybound-aero', status: 'Available', hours: 1234, airworthinessExpiry: '', insuranceExpiry: '', certificateOfReleaseToServiceExpiry: '', certificateOfRegistrationExpiry: '', massAndBalanceExpiry: '', radioStationLicenseExpiry: '', location: '', checklistStatus: 'needs-pre-flight' },
    { id: '2', tailNumber: 'ZS-XYZ', make: 'Piper', model: 'PA-28', companyId: 'skybound-aero', status: 'Available', hours: 5678, airworthinessExpiry: '', insuranceExpiry: '', certificateOfReleaseToServiceExpiry: '', certificateOfRegistrationExpiry: '', massAndBalanceExpiry: '', radioStationLicenseExpiry: '', location: '', checklistStatus: 'needs-pre-flight' },
    { id: '3', tailNumber: 'ZS-DEF', make: 'Sling', model: '2', companyId: 'skybound-aero', status: 'Available', hours: 9101, airworthinessExpiry: '', insuranceExpiry: '', certificateOfReleaseToServiceExpiry: '', certificateOfRegistrationExpiry: '', massAndBalanceExpiry: '', radioStationLicenseExpiry: '', location: '', checklistStatus: 'needs-pre-flight' },
];

export const bookingData: Booking[] = [
  // Today's bookings
  {
    id: 'booking-1',
    companyId: 'skybound-aero',
    date: format(today, 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '11:00',
    aircraft: 'ZS-ABC',
    student: 'Alice Johnson',
    instructor: 'Bob Brown',
    purpose: 'Training',
    status: 'Approved',
  },
  {
    id: 'booking-2',
    companyId: 'skybound-aero',
    date: format(today, 'yyyy-MM-dd'),
    startTime: '12:00',
    endTime: '13:00',
    aircraft: 'ZS-XYZ',
    student: 'Charlie Davis',
    instructor: 'Dave Edwards',
    purpose: 'Training',
    status: 'Approved',
  },
  // Tomorrow's booking
  {
    id: 'booking-3',
    companyId: 'skybound-aero',
    date: format(addDays(today, 1), 'yyyy-MM-dd'),
    startTime: '10:00',
    endTime: '12:00',
    aircraft: 'ZS-DEF',
    purpose: 'Maintenance',
    status: 'Approved',
  },
   // Yesterday's booking
  {
    id: 'booking-4',
    companyId: 'skybound-aero',
    date: format(addDays(today, -1), 'yyyy-MM-dd'),
    startTime: '14:00',
    endTime: '16:00',
    aircraft: 'ZS-ABC',
    student: 'Eve Williams',
    instructor: 'Frank Green',
    purpose: 'Training',
    status: 'Completed',
  },
  // A booking later in the week
  {
    id: 'booking-5',
    companyId: 'skybound-aero',
    date: format(addDays(today, 3), 'yyyy-MM-dd'),
    startTime: '11:00',
    endTime: '12:30',
    aircraft: 'ZS-XYZ',
    student: 'Grace Hall',
    instructor: 'Bob Brown',
    purpose: 'Training',
    status: 'Approved',
  },
];
