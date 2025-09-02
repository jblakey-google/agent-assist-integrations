// @ts-nocheck
import { getEnabledFeatureList } from '../../config';

export const AgentAssistContainer = () => {
  return <agent-assist-ui-modules-v2 style={{ minHeight: '100vh' }} features={getEnabledFeatureList()} />;
};
