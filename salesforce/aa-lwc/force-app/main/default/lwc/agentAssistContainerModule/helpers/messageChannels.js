/**
 * Copyright 2024 Google LLC
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
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE
} from "lightning/messageService";

import conversationAgentSendChannel from "@salesforce/messageChannel/lightning__conversationAgentSend";
import conversationEndUserMessageChannel from "@salesforce/messageChannel/lightning__conversationEndUserMessage";
import conversationEndedChannel from "@salesforce/messageChannel/lightning__conversationEnded";

function handleConversationEnded(
  message, recordId, developmentMode, conversationName, features) {


  if (recordId !== message.recordId) return; // conditionally ignore event
  if (developmentMode) {
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
  senderRole, message, recordId, developmentMode, conversationId) {
  if (recordId !== message.recordId) return; // conditionally ignore event
  if (developmentMode) {
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

export function subscribeToMessageChannels(
  recordId, developmentMode, conversationName, features,
  conversationId, messageContext) {

  subscribeToMessageChannel(
    messageContext,
    conversationAgentSendChannel,
    (event) => handleMessageSend(
      'HUMAN_AGENT', event, recordId, developmentMode, conversationId)
  );
  subscribeToMessageChannel(
    messageContext,
    conversationEndUserMessageChannel,
    (event) => handleMessageSend(
      'END_USER', event, recordId, developmentMode, conversationId)
  );
  subscribeToMessageChannel(
    messageContext,
    conversationEndedChannel,
    (event) => handleConversationEnded(
      event, recordId, developmentMode, conversationName, features)
  );
}

function unsubscribeToMessageChannel(subscription) {
  unsubscribe(subscription);
  subscription = null;
}
export function unsubscribeToMessageChannels() {
  unsubscribeToMessageChannel(conversationAgentSendChannel);
  unsubscribeToMessageChannel(conversationEndUserMessageChannel);
  unsubscribeToMessageChannel(conversationEndedChannel);
}

export default {
  subscribeToMessageChannels,
  unsubscribeToMessageChannels
};
