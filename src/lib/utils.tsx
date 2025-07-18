import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays, format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import React from 'react';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SERVICE_INTERVALS = {
  'A-Check': 50,
  'B-Check': 100,
  'C-Check': 500,
};

export const getNextService = (hours: number): { type: string; hoursUntil: number } => {
  const nextA = SERVICE_INTERVALS['A-Check'] - (hours % SERVICE_INTERVALS['A-Check']);
  const nextB = SERVICE_INTERVALS['B-Check'] - (hours % SERVICE_INTERVALS['B-Check']);
  const nextC = SERVICE_INTERVALS['C-Check'] - (hours % SERVICE_INTERVALS['C-Check']);

  let hoursUntil = nextA;
  let type = 'A-Check';

  if (nextB < hoursUntil) {
    hoursUntil = nextB;
    type = 'B-Check';
  }

  if (nextC < hoursUntil) {
    hoursUntil = nextC;
    type = 'C-Check';
  }

  return { type, hoursUntil: parseFloat(hoursUntil.toFixed(1)) };
};

export const getExpiryBadge = (expiryDate: string) => {
    const today = new Date('2024-08-15'); // Hardcoding date for consistent display
    today.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison
    const date = parseISO(expiryDate);
    const daysUntil = differenceInDays(date, today);

    let variant: "success" | "warning" | "destructive" | "default" | "orange" = "success";

    if (daysUntil < 0) {
        variant = 'destructive'; // Expired - Red
    } else if (daysUntil <= 30) {
        variant = 'orange'; // Expires in 1 month - Orange
    } else if (daysUntil <= 60) {
        variant = 'warning'; // Expires in 2 months - Yellow
    } else {
        variant = 'success'; // Not expired - Green
    }

    const formattedDate = format(date, 'MMM d, yyyy');

    return (
        <Badge variant={variant}>{formattedDate}</Badge>
    )
  }
