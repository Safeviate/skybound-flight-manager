export interface ThemeConfig {
  primary?: string;
  background?: string;
  card?: string;
  accent?: string;
  foreground?: string;
  cardForeground?: string;
  popover?: string;
  popoverForeground?: string;
  secondary?: string;
  secondaryForeground?: string;
  muted?: string;
  mutedForeground?: string;
  destructive?: string;
  destructiveForeground?: string;
  border?: string;
  input?: string;
  ring?: string;
}

export interface AppConfig {
  useMockData: boolean;
  appName: string;
}
