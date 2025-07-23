
'use client';

import { useUser } from '@/context/user-provider';
import { useEffect } from 'react';
import type { ThemeColors } from '@/lib/types';
import config from '@/config';


export function DynamicThemeApplicator() {
  const { company } = useUser();

  useEffect(() => {
    // Start with the environment-specific base theme
    const baseTheme = config.theme;
    
    // Allow a logged-in user's company theme to override the base theme
    const theme = company?.theme ? { ...baseTheme, ...company.theme } : baseTheme;

    const root = document.documentElement;

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
          root.style.setProperty(property, value);
      }
    }
  }, [company]);

  return null; // This component does not render anything
}
