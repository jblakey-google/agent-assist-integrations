import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import AgentAssistConfig from '../../../types/ServiceConfiguration';

export interface AgentAssistAdminState extends Omit<AgentAssistConfig, 'enabled'> {
  hasError: boolean;
}

const initialState = {
  conversation_profile: '',
  custom_api_endpoint: '',
  agent_coaching: false,
  conversation_summary: false,
  knowledge_assist: false,
  smart_reply: false,
  enable_voice: false,
  notifier_server_endpoint: '',
  transcription: {
    enabled: false,
    version: {
      live_transcription: true,
      intermediate_transcription: false,
    },
  },
  debug: false,
  hasError: false,
} as AgentAssistAdminState;

const agentAssistAdminSlice = createSlice({
  name: 'agentAssistAdmin',
  initialState,
  reducers: {
    updateAgentAssistAdminState(state, action: PayloadAction<Partial<AgentAssistAdminState>>) {
      return { ...state, ...action.payload };
    },
  },
});
export const { updateAgentAssistAdminState } = agentAssistAdminSlice.actions;
export const reducerHook = () => ({ agentAssistAdmin: agentAssistAdminSlice.reducer });
export default agentAssistAdminSlice.reducer;
