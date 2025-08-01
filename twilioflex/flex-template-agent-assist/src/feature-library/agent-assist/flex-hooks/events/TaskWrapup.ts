import { FlexEvent, AgentAssistAction, invokeAgentAssistAction } from '../../../../types/feature-loader';
import logger from '../../../../utils/logger';

export const eventName = FlexEvent.taskWrapup;
export const eventHook = function () {
  logger.debug('[agent-assist][conversation-summarization] Requesting conversation summary');
  invokeAgentAssistAction(AgentAssistAction.conversationSummarizationRequested, {});
};
