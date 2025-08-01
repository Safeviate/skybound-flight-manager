
import type { Aircraft, Booking } from '@/lib/types';
import { format, addDays, setHours } from 'date-fns';

const today = new Date();

export const aircraftData: Aircraft[] = [
    { id: '1', tailNumber: 'ZS-ABC', make: 'Cessna', model: '172', companyId: 'skybound-aero', status: 'Available', hours: 1234, airworthinessExpiry: '', insuranceExpiry: '', certificateOfReleaseToServiceExpiry: '', certificateOfRegistrationExpiry: '', massAndBalanceExpiry: '', radioStationLicenseExpiry: '', location: '', checklistStatus: 'needs-pre-flight' },
    { id: '2', tailNumber: 'ZS-XYZ', make: 'Piper', model: 'PA-28', companyId: 'skybound-aero', status: 'Available', hours: 5678, airworthinessExpiry: '', insuranceExpiry: '', certificateOfReleaseToServiceExpiry: '', certificateOfRegistrationExpiry: '', massAndBalanceExpiry: '', radioStationLicenseExpiry: '', location: '', checklistStatus: 'needs-pre-flight' },
    { id: '3', tailNumber: 'ZS-DEF', make: 'Sling', model: '2', companyId: 'skybound-aero', status: 'Available', hours: 9101, airworthinessExpiry: '', insuranceExpiry: '', certificateOfReleaseToServiceExpiry: '', certificateOfRegistrationExpiry: '', massAndBalanceExpiry: '', radioStationLicenseExpiry: '', location: '', checklistStatus: 'needs-pre-flight' },
];

export const bookingData: Booking[] = [];
