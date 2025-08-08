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

import { wire } from "lwc";
import {
  APPLICATION_SCOPE,
  subscribe,
  unsubscribe,
  MessageContext
} from "lightning/messageService";

import conversationAgentSendChannel from "@salesforce/messageChannel/lightning__conversationAgentSend";
import conversationEndUserMessageChannel from "@salesforce/messageChannel/lightning__conversationEndUserMessage";
import conversationEndedChannel from "@salesforce/messageChannel/lightning__conversationEnded";
import tabClosedChannel from "@salesforce/messageChannel/lightning__tabClosed";

const MessagingMixin = (BaseClass) =>
  class extends BaseClass {
    @wire(MessageContext) messageContext;

    ////////////////////////////////////////////////////////////////////////////
    // Init & Teardown
    ////////////////////////////////////////////////////////////////////////////

    initMessaging() {
      // Set up Agent Assist UIM to work with Messaging for In-App and Web
      this.generateConversationName();
      this.subscribeToMessageChannels();
      this.listenToAgentAssistEventsForMessaging();
    }

    teardownMessaging() {
      // Clean up Agent Assist UIM Messaging for In-App and Web
      this.unsubscribeFromMessagingChannels();
    }

    ////////////////////////////////////////////////////////////////////////////
    // Setup Event Listeners and Subscriptions
    ////////////////////////////////////////////////////////////////////////////

    listenToAgentAssistEventsForMessaging() {
      // Handle Agent Assist events
      addAgentAssistEventListener(
        "smart-reply-selected",
        (event) => this.handleSmartReplySelectedForMessaging(event),
        { namespace: this.recordId }
      );
      addAgentAssistEventListener(
        "agent-coaching-response-selected",
        (event) => this.handleAgentCoachingResponseSelectedForMessaging(event),
        { namespace: this.recordId }
      );
    }

    subscribeToMessageChannels() {
      // Attach handler functions to Messaging events
      subscribe(
        this.messageContext,
        conversationAgentSendChannel,
        (event) => this.handleMessageSendForMessaging("HUMAN_AGENT", event),
        { scope: APPLICATION_SCOPE }
      );
      subscribe(
        this.messageContext,
        conversationEndUserMessageChannel,
        (event) => this.handleMessageSendForMessaging("END_USER", event),
        { scope: APPLICATION_SCOPE }
      );
      subscribe(
        this.messageContext,
        conversationEndedChannel,
        (event) => this.handleConversationEndedForMessaging(event),
        { scope: APPLICATION_SCOPE }
      );
      subscribe(
        this.messageContext,
        tabClosedChannel,
        (event) => this.handleTabClosedForMessaging(event),
        { scope: APPLICATION_SCOPE }
      );
    }

    unsubscribeFromMessagingChannels() {
      // Detach handler functions from Messaging events
      unsubscribe(conversationAgentSendChannel);
      unsubscribe(conversationEndUserMessageChannel);
      unsubscribe(conversationEndedChannel);
      unsubscribe(tabClosedChannel);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Handle Events
    ////////////////////////////////////////////////////////////////////////////

    handleMessageSendForMessaging(senderRole, message) {
      // Send new Messaging messages to the UI Connector
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

    async handleSmartReplySelectedForMessaging(event) {
      // Handle Smart Reply selection by the agent
      await this.refs.conversationToolkitApi.setAgentInput(this.recordId, {
        text: event.detail.answer.reply
      });
    }

    async handleAgentCoachingResponseSelectedForMessaging(event) {
      // Handle Agent Coaching response selection
      await this.refs.conversationToolkitApi.setAgentInput(this.recordId, {
        text: event.detail.selectedResponse
      });
    }

    handleConversationEndedForMessaging(event) {
      // Generate a summary when a Messaging conversation ends
      this.debugLog("handleConversationEnded called");

      if (this.recordId !== event.recordId) return;
      if (this.features.includes("CONVERSATION_SUMMARIZATION")) {
        dispatchAgentAssistEvent(
          "conversation-completed",
          { detail: { conversationName: this.conversationName } },
          { namespace: this.recordId }
        );

        // Give handleTabClosed opportunity to cancel summarization
        this.cancelSummarizationTimeout = setTimeout(() => {
          // Create a synthetic click event to trigger summarization modal
          const summarizationButton = this.template.querySelector(
            ".generate-summary-footer button"
          );
          summarizationButton.dispatchEvent(new Event("click"));
        }, 500);
      }
    }

    handleTabClosedForMessaging(event) {
      // Handle Messaging Session tab closed event
      this.debugLog("handleTabClosed called");
      // Cancel summarization if the tab is closing
      if (this.cancelSummarizationTimeout) {
        clearTimeout(this.cancelSummarizationTimeout);
      }
    }
  };

export default MessagingMixin;
