import developmentConfig from './development';
import betaConfig from './beta';
import { AppConfig } from './types';

const config = process.env.NODE_ENV === 'production' ? betaConfig : developmentConfig;

export default config as AppConfig;
