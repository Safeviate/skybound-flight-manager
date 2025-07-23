import { AppConfig } from './types';

const config: Partial<AppConfig> = {
  useMockData: false,
  appName: 'Safeviate (Beta)',
  theme: {
    primary: '142.1 76.2% 36.3%', // A Green color for Beta
    background: '0 0% 98%',
    card: '0 0% 100%',
    accent: '25 95% 53%', // An Orange color for Beta
  },
};

export default config;
