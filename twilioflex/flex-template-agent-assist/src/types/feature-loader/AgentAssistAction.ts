// @ts-nocheck
export enum AgentAssistAction {
  analyzeContentRequest = 'analyze-content-requested',
  activeConversationSelected = 'active-conversation-selected',
  conversationSummarizationRequested = 'conversation-summarization-requested',
}

export const invokeAgentAssistAction = (name: AgentAssistAction, payload: any) => {
  dispatchAgentAssistEvent(name, {
    detail: {
      ...payload,
    },
  });
};
