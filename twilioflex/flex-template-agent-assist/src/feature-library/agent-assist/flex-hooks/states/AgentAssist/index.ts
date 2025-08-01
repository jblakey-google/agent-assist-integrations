import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface AgentAssistState {
  status: string;
  authToken: string;
}

const initialState = {
  status: 'disconnected',
  authToken: '',
} as AgentAssistState;

const agentAssistSlice = createSlice({
  name: 'agentAssist',
  initialState,
  reducers: {
    updateAgentAssistState(state, action: PayloadAction<AgentAssistState>) {
      state.status = action.payload.status;
      state.authToken = action.payload.authToken;
    },
  },
});
export const { updateAgentAssistState } = agentAssistSlice.actions;
export const reducerHook = () => ({ agentAssist: agentAssistSlice.reducer });
export default agentAssistSlice.reducer;
