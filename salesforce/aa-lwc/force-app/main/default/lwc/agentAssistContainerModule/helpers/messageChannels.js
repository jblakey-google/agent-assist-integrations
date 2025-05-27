/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    APPLICATION_SCOPE,
    subscribe,
    unsubscribe
} from "lightning/messageService";

import conversationAgentSendChannel from "@salesforce/messageChannel/lightning__conversationAgentSend";
import conversationEndUserMessageChannel from "@salesforce/messageChannel/lightning__conversationEndUserMessage";
import conversationEndedChannel from "@salesforce/messageChannel/lightning__conversationEnded";

function handleConversationEnded(
  message, recordId, debugMode, conversationName, features) {


  if (recordId !== message.recordId) return; // conditionally ignore event
  if (debugMode) {
    console.log(
      "handleConversationEnded:",
      conversationName,
      recordId,
      message
    );
  }
  if (features.includes("CONVERSATION_SUMMARIZATION")) {
    dispatchAgentAssistEvent(
      "conversation-summarization-requested",
      { detail: { conversationName: conversationName } },
      { namespace: recordId }
    );
  }
}

function handleMessageSend(
  senderRole, message, recordId, debugMode, conversationId) {
  if (recordId !== message.recordId) return; // conditionally ignore event
  if (debugMode) {
    console.log(
      "handleMessageSend:",
      conversationId,
      recordId,
      senderRole,
      message
    );
  }
  dispatchAgentAssistEvent(
    "analyze-content-requested",
    {
      detail: {
        conversationId: conversationId,
        participantRole: senderRole,
        request: {
          textInput: {
            text: message.content,
          languageCode: "us"
          }
        }
      }
    },
    { namespace: recordId }
  );
}

function subscribeToMessageChannel(messageContext, channel, handler) {
  return subscribe(messageContext, channel, (message) => handler(message), {
    scope: APPLICATION_SCOPE
  });
}

let subscriptions = {};

export function subscribeToMessageChannels(
  recordId, debugMode, conversationName, features,
  conversationId, messageContext) {

  if (!messageContext) {
    console.error('MessageContext is not available.');
    return;
  }

  subscriptions.conversationAgentSend = subscribeToMessageChannel(
    messageContext,
    conversationAgentSendChannel,
    (event) => handleMessageSend(
      'HUMAN_AGENT', event, recordId, debugMode, conversationId)
  );
  subscriptions.conversationEndUserMessage = subscribeToMessageChannel(
    messageContext,
    conversationEndUserMessageChannel,
    (event) => handleMessageSend(
      'END_USER', event, recordId, debugMode, conversationId)
  );
  subscriptions.conversationEnded = subscribeToMessageChannel(
    messageContext,
    conversationEndedChannel,
    (event) => handleConversationEnded(
      event, recordId, debugMode, conversationName, features)
  );
}

export function unsubscribeToMessageChannels() {
  if (subscriptions.conversationAgentSend) {
    unsubscribe(subscriptions.conversationAgentSend);
    subscriptions.conversationAgentSend = null;
  }
  if (subscriptions.conversationEndUserMessage) {
    unsubscribe(subscriptions.conversationEndUserMessage);
    subscriptions.conversationEndUserMessage = null;
  }
  if (subscriptions.conversationEnded) {
    unsubscribe(subscriptions.conversationEnded);
    subscriptions.conversationEnded = null;
  }
}

export default {
  subscribeToMessageChannels,
  unsubscribeToMessageChannels
};
