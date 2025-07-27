
'use client';

import { useUser } from '@/context/user-provider';
import { useEffect } from 'react';

// Function to convert hex to HSL
const hexToHSL = (hex: string): string | null => {
    if (!hex) return null;
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
    } else {
        return null; // Invalid hex code
    }

    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
};


export function DynamicThemeApplicator() {
  const { company } = useUser();

  useEffect(() => {
    const root = document.documentElement;

    if (company?.theme) {
        const theme = company.theme;

        const themeProperties: { [key: string]: string | undefined | null } = {
            '--primary': hexToHSL(theme.primary as string),
            '--background': hexToHSL(theme.background as string),
            '--accent': hexToHSL(theme.accent as string),
            '--card': theme.card,
            '--card-foreground': theme.cardForeground,
            '--popover': theme.popover,
            '--popover-foreground': theme.popoverForeground,
            '--primary-foreground': theme.primaryForeground,
            '--secondary': theme.secondary,
            '--secondary-foreground': theme.secondaryForeground,
            '--muted': theme.muted,
            '--muted-foreground': theme.mutedForeground,
            '--destructive': theme.destructive,
            '--destructive-foreground': theme.destructiveForeground,
            '--border': theme.border,
            '--input': theme.input,
            '--ring': theme.ring,
        };

        for (const [property, value] of Object.entries(themeProperties)) {
            if (value) {
                root.style.setProperty(property, value);
            } else {
                 root.style.removeProperty(property);
            }
        }
    } else {
        // Optionally, reset to default if no company theme
         const defaultProperties = ['--primary', '--background', '--accent', '--card', '--card-foreground', '--popover', '--popover-foreground', '--primary-foreground', '--secondary', '--secondary-foreground', '--muted', '--muted-foreground', '--destructive', '--destructive-foreground', '--border', '--input', '--ring'];
         defaultProperties.forEach(prop => root.style.removeProperty(prop));
    }
  }, [company]);

  return null; // This component does not render anything
}
