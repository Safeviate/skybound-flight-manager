
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays, format, parseISO, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import React from 'react';
import type { RiskLikelihood, RiskSeverity, TrainingLogEntry } from './types';

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

export const getExpiryBadge = (
    expiryDate: string, 
    orangeWarningDays: number = 30, 
    yellowWarningDays: number = 60
) => {
    const today = new Date('2024-08-15'); // Hardcoding date for consistent display
    today.setHours(0, 0, 0, 0); // Set to start of day for consistent comparison
    const date = parseISO(expiryDate);
    const daysUntil = differenceInDays(date, today);

    let variant: "success" | "warning" | "destructive" | "default" | "orange" = "success";

    if (daysUntil < 0) {
        variant = 'destructive'; // Expired - Red
    } else if (daysUntil <= orangeWarningDays) {
        variant = 'orange'; // Expires in 1 month - Orange
    } else if (daysUntil <= yellowWarningDays) {
        variant = 'warning'; // Expires in 2 months - Yellow
    } else {
        variant = 'success'; // Not expired - Green
    }

    const formattedDate = format(date, 'MMM d, yyyy');

    return (
        <Badge variant={variant}>{formattedDate}</Badge>
    )
  }

/**
 * Calculates the distance between two points on Earth using the Haversine formula.
 * @param coords1 - The coordinates of the first point.
 * @param coords2 - The coordinates of the second point.
 * @returns The distance in kilometers.
 */
export function getDistance(
  coords1: { lat: number; lon: number },
  coords2: { lat: number; lon: number }
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (coords2.lat - coords1.lat) * (Math.PI / 180);
  const dLon = (coords2.lon - coords1.lon) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coords1.lat * (Math.PI / 180)) *
      Math.cos(coords2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Risk Matrix Logic
const likelihoodMap: Record<RiskLikelihood, number> = {
  'Rare': 1,
  'Unlikely': 2,
  'Possible': 3,
  'Likely': 4,
  'Certain': 5,
};

const severityMap: Record<RiskSeverity, number> = {
  'Insignificant': 1,
  'Minor': 2,
  'Moderate': 3,
  'Major': 4,
  'Catastrophic': 5,
};

export const getRiskScore = (likelihood: RiskLikelihood, severity: RiskSeverity): number => {
    return likelihoodMap[likelihood] * severityMap[severity];
}

export const getRiskLevel = (score: number | null | undefined): 'Low' | 'Medium' | 'High' | 'Extreme' | 'N/A' => {
      if (score === null || score === undefined) return 'N/A';
      if (score <= 4) return 'Low';
      if (score <= 9) return 'Medium';
      if (score <= 16) return 'High';
      return 'Extreme';
  }

export const getRiskScoreColor = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return 'hsl(var(--muted-foreground))';
  if (score <= 4) return `hsl(var(--success))`;
  if (score <= 9) return `hsl(var(--warning))`;
  if (score <= 16) return `hsl(var(--orange))`;
  return `hsl(var(--destructive))`;
}

export const getRiskScoreColorWithOpacity = (score: number | null | undefined, opacity: number = 1): string => {
  if (score === null || score === undefined) return `hsla(var(--muted-foreground), ${opacity})`;
  if (score <= 4) return `hsla(var(--success), ${opacity})`;
  if (score <= 9) return `hsla(var(--warning), ${opacity})`;
  if (score <= 16) return `hsla(var(--orange), ${opacity})`;
  return `hsla(var(--destructive), ${opacity})`;
}

// Fatigue Risk Management
export const calculateFlightHours = (logs: TrainingLogEntry[], periodInDays: number): number => {
  const today = new Date('2024-08-15');
  const startDate = subDays(today, periodInDays - 1);
  
  const relevantLogs = logs.filter(log => {
    const logDate = parseISO(log.date);
    return logDate >= startDate && logDate <= today;
  });

  const totalHours = relevantLogs.reduce((sum, log) => sum + log.flightDuration, 0);
  return parseFloat(totalHours.toFixed(1));
};
