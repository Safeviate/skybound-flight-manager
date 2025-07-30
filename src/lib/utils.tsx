

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInDays, format, parseISO, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import React, { useCallback } from 'react';
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
        variant = 'orange'; // Expires soon - Orange
    } else if (daysUntil <= yellowWarningDays) {
        variant = 'warning'; // Expires later - Yellow
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
  'Extremely Improbable': 1,
  'Improbable': 2,
  'Remote': 3,
  'Occasional': 4,
  'Frequent': 5,
};

const severityMap: Record<RiskSeverity, number> = {
  'Negligible': 1,
  'Minor': 2,
  'Major': 3,
  'Hazardous': 4,
  'Catastrophic': 5,
};

export const getRiskScore = (likelihood: RiskLikelihood, severity: RiskSeverity): number => {
    if (!likelihood || !severity) return 0;
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
  
  const riskCode = getRiskCodeFromScore(score);
  
  const riskClassifications: Record<string, string> = {
    'Intolerable': 'hsl(var(--destructive))',
    'Tolerable': 'hsl(var(--orange))',
    'Acceptable': 'hsl(var(--success))',
  };

  if (riskCode.level in riskClassifications) {
    return riskClassifications[riskCode.level];
  }
  
  // Fallback based on score if code not found (should not happen)
  if (score <= 4) return `hsl(var(--success))`;
  if (score <= 9) return `hsl(var(--orange))`;
  if (score <= 16) return `hsl(var(--orange))`;
  return `hsl(var(--destructive))`;
}

const getRiskCodeFromScore = (score: number) => {
    if (score >= 20) return { code: '5A/5B/4A', level: 'Intolerable' };
    if (score >= 15) return { code: '5C/4B/3A', level: 'Intolerable' };
    if (score >= 10) return { code: '5D/4C/3B/2A/2B', level: 'Tolerable' };
    if (score >= 5) return { code: '5E/4D/3C/3D/1A/2C', level: 'Acceptable' };
    return { code: '4E/3E/2D/2E/1B-1E', level: 'Acceptable' };
};


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

    

