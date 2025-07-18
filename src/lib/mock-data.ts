import type { Aircraft, Student, Personnel, Booking } from './types';
import { getNextService } from './utils';

// Aircraft Data
const rawAircraftData = [
  { id: '1', tailNumber: 'N12345', model: 'Cessna 172 Skyhawk', status: 'Available', hours: 1250.5, airworthinessExpiry: '2025-05-20', insuranceExpiry: '2025-01-15' }, // Green / Green
  { id: '2', tailNumber: 'N54321', model: 'Piper PA-28 Archer', status: 'In Maintenance', hours: 850.2, airworthinessExpiry: '2024-09-10', insuranceExpiry: '2024-08-15' }, // Yellow / Orange
  { id: '3', tailNumber: 'N67890', model: 'Diamond DA40 Star', status: 'Booked', hours: 475.8, airworthinessExpiry: '2024-06-01', insuranceExpiry: '2025-06-01' }, // Red / Green
  { id: '4', tailNumber: 'N11223', model: 'Cirrus SR22', status: 'Available', hours: 320.0, airworthinessExpiry: '2025-03-15', insuranceExpiry: '2024-05-20' }, // Green / Red
  { id: '5', tailNumber: 'N44556', model: 'Beechcraft G36 Bonanza', status: 'Available', hours: 2100.7, airworthinessExpiry: '2024-08-10', insuranceExpiry: '2024-09-01' }, // Orange / Yellow
];

export const aircraftData: Aircraft[] = rawAircraftData.map(ac => {
    const nextService = getNextService(ac.hours);
    return {
        ...ac,
        nextServiceType: nextService.type,
        hoursUntilService: nextService.hoursUntil,
    }
});


// Student Data
export const studentData: Student[] = [
  { id: '1', name: 'John Doe', instructor: 'Mike Ross', flightHours: 45.5, progress: 75 },
  { id: '2', name: 'Jane Smith', instructor: 'Sarah Connor', flightHours: 22.0, progress: 40 },
  { id: '3', name: 'Peter Jones', instructor: 'Mike Ross', flightHours: 60.2, progress: 90 },
  { id: '4', name: 'Emily White', instructor: 'Laura Croft', flightHours: 10.5, progress: 20 },
  { id: '5', name: 'Chris Green', instructor: 'Sarah Connor', flightHours: 35.8, progress: 65 },
];

// Personnel Data
export const personnelData: Personnel[] = [
  { id: '1', name: 'Mike Ross', role: 'Instructor', email: 'mike.ross@skybound.com', phone: '555-0101' },
  { id: '2', name: 'Sarah Connor', role: 'Instructor', email: 'sarah.connor@skybound.com', phone: '555-0102' },
  { id: '3', name: 'Hank Hill', role: 'Maintenance', email: 'hank.hill@skybound.com', phone: '555-0103' },
  { id: '4', name: 'Laura Croft', role: 'Instructor', email: 'laura.croft@skybound.com', phone: '555-0104' },
  { id: '5', name: 'Admin User', role: 'Admin', email: 'admin@skybound.com', phone: '555-0100' },
];

// Booking Data
export const bookingData: Booking[] = [
  { id: '1', date: '2024-08-15', time: '14:00', aircraft: 'N12345', student: 'John Doe', instructor: 'Mike Ross', purpose: 'Training' },
  { id: '2', date: '2024-08-16', time: '09:00', aircraft: 'N54321', student: 'N/A', instructor: 'Hank Hill', purpose: 'Maintenance' },
  { id: '3', date: '2024-08-16', time: '11:00', aircraft: 'N67890', student: 'Jane Smith', instructor: 'Sarah Connor', purpose: 'Training' },
  { id: '4', date: '2024-08-17', time: '10:00', aircraft: 'N11223', student: 'Peter Jones', instructor: 'Mike Ross', purpose: 'Training' },
  { id: '5', date: '2024-08-17', time: '16:00', aircraft: 'N44556', student: 'N/A', instructor: 'N/A', purpose: 'Private' },
];
