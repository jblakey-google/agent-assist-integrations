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
import { getRecord, getFieldValue } from "lightning/uiRecordApi";

const FIELDS = ["Contact.Phone"];

const TwilioFlexMixin = (BaseClass) =>
  class extends BaseClass {
    @wire(getRecord, { recordId: "$recordId", fields: FIELDS }) contact;

    get contactPhone() {
      return getFieldValue(this.contact.data, "Contact.Phone");
    }

    ////////////////////////////////////////////////////////////////////////////
    // Init & Teardown
    ////////////////////////////////////////////////////////////////////////////

    async initTwilioFlex() {
      // Set up Agent Assist UIM to work with Twilio Flex
      this.debugLog("initTwilioFlex called");
      await this.getConversationName(this.contactPhone);
      if (
        !this.conversationName ||
        (await this.isConversationCompleted(this.contactPhone))
      ) {
        this.pollForConversationName(this.contactPhone);
      }
      this.listenToAgentAssistEventsForTwilioFlex();
    }

    teardownTwilioFlex() {
      // Clean up Agent Assist UIM Twilio Flex
      this.debugLog("teardownTwilioFlex called");
    }

    ////////////////////////////////////////////////////////////////////////////
    // Setup Event Listeners and Subscriptions
    ////////////////////////////////////////////////////////////////////////////

    listenToAgentAssistEventsForTwilioFlex() {
      this.debugLog("listenToAgentAssistEventsForTwilioFlex called");
      // Handle Agent Assist events
      addAgentAssistEventListener(
        "conversation-completed",
        this.handleConversationEndedForTwilioFlex,
        { namespace: this.recordId }
      );
    }

    ////////////////////////////////////////////////////////////////////////////
    // Handle Events
    ////////////////////////////////////////////////////////////////////////////

    handleConversationEndedForTwilioFlex() {
      // Generate a summary when a Twilio Flex conversation ends
      this.debugLog("handleConversationEndedForTwilioFlex called");
      const summarizationButton = this.template.querySelector(
        ".generate-summary-footer button"
      );
      summarizationButton.dispatchEvent(new MouseEvent("click"));
      dispatchAgentAssistEvent(
        "conversation-summarization-requested",
        { detail: { conversationName: this.conversationName } },
        { namespace: this.recordId }
      );
      this.pollForConversationName(this.contactPhone);
    }
  };

export default TwilioFlexMixin;