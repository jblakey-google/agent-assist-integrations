import { isFeatureEnabled } from '../config';

export const isAgentAssistEnabled = (): boolean => {
  return isFeatureEnabled();
};
