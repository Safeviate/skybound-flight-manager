import type { Aircraft, Booking } from '@/lib/types';
import { format, addDays, setHours } from 'date-fns';

const today = new Date();

export const aircraftData: Aircraft[] = [];

export const bookingData: Booking[] = [];
