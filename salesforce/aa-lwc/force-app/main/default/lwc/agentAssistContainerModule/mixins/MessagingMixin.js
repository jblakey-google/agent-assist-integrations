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

import { wire, api } from "lwc";
import {
  APPLICATION_SCOPE,
  subscribe,
  unsubscribe,
  MessageContext
} from "lightning/messageService";

import conversationAgentSendChannel from "@salesforce/messageChannel/lightning__conversationAgentSend";
import conversationEndUserMessageChannel from "@salesforce/messageChannel/lightning__conversationEndUserMessage";
import conversationEndedChannel from "@salesforce/messageChannel/lightning__conversationEnded";

const MessagingMixin = (BaseClass) =>
  class extends BaseClass {
    @wire(MessageContext) messageContext;

    initMessaging() {
      // Set up Agent Assist UIM to work with Messaging for In-App and Web
      this.generateConversationName()
      this.subscribeToMessageChannels();

      // Handle Agent Assist events
      addAgentAssistEventListener(
        "smart-reply-selected",
        (event) => this.handleSmartReplySelected(event),
        { namespace: this.recordId }
      );
      addAgentAssistEventListener(
        "agent-coaching-response-selected",
        (event) => this.handleAgentCoachingResponseSelected(event),
        { namespace: this.recordId }
      );
    }

    teardownMessaging() {
      // Clean up Agent Assist UIM Messaging for In-App and Web
      this.unsubscribeFromMessagingChannels();
    }

    handleConversationEnded(event) {
      // Generate a summary when a Messaging conversation ends.
      if (this.recordId !== event.recordId) return;
      if (this.features.includes("CONVERSATION_SUMMARIZATION")) {
        // Creates a synthetic click event to trigger summarization modal.
        const summarizationButton = this.template.querySelector(
          ".generate-summary-footer button"
        );
        summarizationButton.dispatchEvent(new Event("click"));
      }
    }

    handleMessageSend(senderRole, message) {
      // Send new Messaging messages to the UI Connector.
      if (this.recordId !== message.recordId) return;
      dispatchAgentAssistEvent(
        "analyze-content-requested",
        {
          detail: {
            conversationId: this.conversationId,
            participantRole: senderRole,
            request: {
              textInput: { text: message.content, languageCode: "us" }
            }
          }
        },
        { namespace: this.recordId }
      );
    }

    async handleSmartReplySelected(event) {
      await this.refs.conversationToolkitApi.setAgentInput(this.recordId, {
        text: event.detail.answer.reply
      });
    }

    async handleAgentCoachingResponseSelected(event) {
      await this.refs.conversationToolkitApi.setAgentInput(this.recordId, {
        text: event.detail.selectedResponse
      });
    }

    subscribeToMessageChannels() {
      // attach handler functions to Messaging events.
      subscribe(
        this.messageContext,
        conversationAgentSendChannel,
        (event) => this.handleMessageSend("HUMAN_AGENT", event),
        { scope: APPLICATION_SCOPE }
      );
      subscribe(
        this.messageContext,
        conversationEndUserMessageChannel,
        (event) => this.handleMessageSend("END_USER", event),
        { scope: APPLICATION_SCOPE }
      );
      subscribe(
        this.messageContext,
        conversationEndedChannel,
        (event) => this.handleConversationEnded(event),
        { scope: APPLICATION_SCOPE }
      );
    }

    generateConversationName() {
      // Create a Dialogflow conversation name.
      let prefix = this.conversationProfile.split('/conversationProfile')[0]
      this.conversationId = `SF-${this.recordId}`;
      this.conversationName = `${prefix}/conversations/${this.conversationId}`
      this.debugLog(`this.conversationName - ${this.conversationName}`)
    }

    unsubscribeFromMessagingChannels() {
      // Detach handler functions from Messaging events.
      unsubscribe(conversationAgentSendChannel);
      unsubscribe(conversationEndUserMessageChannel);
      unsubscribe(conversationEndedChannel);
    }
  };

export default MessagingMixin;
