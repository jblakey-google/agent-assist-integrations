import * as Flex from '@twilio/flex-ui';

import { AgentAssistEvent } from '../../../../types/feature-loader';
import logger from '../../../../utils/logger';

export const agentAssistEventName = AgentAssistEvent.agentCoachingResponseSelected;
export const agentAssistEventHook = function populateMessageInputWithAgentCoachingSuggestion(
  _flex: typeof Flex,
  _manager: Flex.Manager,
  event: any,
) {
  const taskSid = _flex.Manager.getInstance().store.getState().flex.view.selectedTaskSid;
  if (taskSid) {
    const task = _flex.TaskHelper.getTaskByTaskSid(taskSid);
    const conversationSid = _flex.TaskHelper.getTaskConversationSid(task);
    const suggestion = event.detail.selectedResponse;
    logger.debug('[agent-assist][agent-coaching] Setting agent coaching suggestion into message box');
    _flex.Actions.invokeAction('SetInputText', {
      body: suggestion,
      conversationSid,
      selectionStart: suggestion.length,
      selectionEnd: suggestion.length,
    });
  }
};
