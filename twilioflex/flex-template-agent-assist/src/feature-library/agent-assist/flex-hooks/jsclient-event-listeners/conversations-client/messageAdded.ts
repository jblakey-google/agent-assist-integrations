import * as Flex from '@twilio/flex-ui';
import { Message } from '@twilio/conversations';

import {
  FlexJsClient,
  ConversationEvent,
  AgentAssistAction,
  invokeAgentAssistAction,
} from '../../../../../types/feature-loader';

export const clientName = FlexJsClient.conversationsClient;
export const eventName = ConversationEvent.messageAdded;
// when an agent joins a channel for the first time this announces
// them in the chat channel
export const jsClientHook = function analyzeContentRequest(flex: typeof Flex, manager: Flex.Manager, message: Message) {
  const workerIdentity = manager.store.getState().flex.session.identity;
  const conversationId = message.conversation.sid;
  const messageContent = `${message.body}`;
  const participantRole = message.author === workerIdentity ? 'HUMAN_AGENT' : 'END_USER';
  const messageSendTime = `${message.dateCreated?.toString()}`;
  const request = {
    conversationId,
    participantRole,
    request: {
      textInput: {
        text: messageContent,
        messageSendTime,
      },
    },
  };
  invokeAgentAssistAction(AgentAssistAction.analyzeContentRequest, request);
};
