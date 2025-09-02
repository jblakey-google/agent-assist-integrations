import * as Flex from '@twilio/flex-ui';
import { ITask } from '@twilio/flex-ui';

import { FlexEvent, AgentAssistAction, invokeAgentAssistAction } from '../../../../types/feature-loader';
import AgentAssistUtils from '../../utils/agentAssist/AgentAssistUtils';
import logger from '../../../../utils/logger';

async function selectAndAcceptTask(task: ITask) {
  const { sid, taskChannelUniqueName, attributes } = task;
  const agentAssistUtils = AgentAssistUtils.instance;
  let conversationSid;

  if (task !== undefined) {
    if (taskChannelUniqueName === 'voice') {
      conversationSid = task.attributes.call_sid;
    } else {
      conversationSid = Flex.TaskHelper.getTaskConversationSid(task);
    }

    logger.debug(`[Agent-Assist] Setting active conversation to ${conversationSid}`);

    const conversationName = agentAssistUtils.getConversationName(`${conversationSid}`);
    const request = {
      conversationName,
    };
    invokeAgentAssistAction(AgentAssistAction.activeConversationSelected, request);

    if (Flex.TaskHelper.isCallTask(task ?? Flex.TaskHelper.getTaskByTaskSid(conversationSid))) {
      console.log(`[Agent-Assist] Listening for suggestions to conversation ${conversationName}`);
      try {
        agentAssistUtils.subscribeToConversation(conversationName);
      } catch (e: any) {
        logger.debug(e);
      }
    }
  }
}

export const eventName = FlexEvent.taskAccepted;
export const eventHook = function selectAndAcceptTaskHook(flex: typeof Flex, manager: Flex.Manager, task: ITask) {
  selectAndAcceptTask(task);
};
