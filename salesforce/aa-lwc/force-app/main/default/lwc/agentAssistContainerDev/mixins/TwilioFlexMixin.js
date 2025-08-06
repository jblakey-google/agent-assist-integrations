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

    async initTwilioFlex() {
      this.debugLog('initTwilioFlex called')
      this.conversationName = await this.getConversationName(this.contactPhone);

      addAgentAssistEventListener(
        "conversation-completed",
        async () => {
          const summarizationButton = this.template.querySelector(
            ".generate-summary-footer button"
          );
          summarizationButton.dispatch("click");
          dispatchAgentAssistEvent(
            "conversation-summarization-requested",
            { detail: { conversationName: this.conversationName } },
            { namespace: this.recordId }
          );
          await conversationName.delConversationName(this.contactPhone);
        },
        { namespace: this.recordId }
      );
    }

    teardownTwilioFlex() {
      this.debugLog('teardownTwilioFlex called')
    }
  };

export default TwilioFlexMixin;