import developmentConfig from './development';
import betaConfig from './beta';
import { AppConfig } from './types';

const useMockData = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

const config = useMockData ? developmentConfig : betaConfig;

export default {
    ...config,
    useMockData,
} as AppConfig;
