import { AppConfig } from './types';

const config: Partial<AppConfig> = {
  useMockData: true,
  appName: 'Safeviate (Dev)',
  theme: {
    primary: '217.2 91.2% 59.8%', // Default Blue
    background: '0 0% 94.1%',
    card: '0 0% 100%',
    accent: '39 100% 50%', // Default Yellow
  },
};

export default config;
