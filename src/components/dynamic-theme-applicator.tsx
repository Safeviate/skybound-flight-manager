
'use client';

import { useUser } from '@/context/user-provider';
import { useEffect } from 'react';
import type { ThemeColors } from '@/lib/types';
import config from '@/config';


export function DynamicThemeApplicator() {
  const { company } = useUser();

  useEffect(() => {
    // A company's specific theme settings should always override any base theme.
    const theme = company?.theme;
    const root = document.documentElement;

    if (theme) {
        const themeProperties: { [key: string]: string | undefined } = {
        '--background': theme.background,
        '--foreground': theme.foreground,
        '--card': theme.card,
        '--card-foreground': theme.cardForeground,
        '--popover': theme.popover,
        '--popover-foreground': theme.popoverForeground,
        '--primary': theme.primary,
        '--primary-foreground': theme.primaryForeground,
        '--secondary': theme.secondary,
        '--secondary-foreground': theme.secondaryForeground,
        '--muted': theme.muted,
        '--muted-foreground': theme.mutedForeground,
        '--accent': theme.accent,
        '--accent-foreground': theme.accentForeground,
        '--destructive': theme.destructive,
        '--destructive-foreground': theme.destructiveForeground,
        '--border': theme.border,
        '--input': theme.input,
        '--ring': theme.ring,
        };

        for (const [property, value] of Object.entries(themeProperties)) {
            if (value) {
                root.style.setProperty(property, `var(${value})`);
            }
        }
    }
  }, [company]);

  return null; // This component does not render anything
}
