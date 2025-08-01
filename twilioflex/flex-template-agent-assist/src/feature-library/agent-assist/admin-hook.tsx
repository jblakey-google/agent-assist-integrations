import { AgentAssistAdmin } from './custom-components/AgentAssistAdmin/AgentAssistAdmin';

export const adminHook = function addAgentAssistAdmin(payload: any) {
  if (payload.feature !== 'agent_assist') return;
  payload.component = <AgentAssistAdmin {...payload} />;
  payload.hideDefaultComponents = true;
};
