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
import { getRecord } from "lightning/uiRecordApi";
import scvEventNames from "../data/scvEventNames";

// Great SCV LWC examples here
// https://github.com/service-cloud-voice/examples-from-doc/blob/main/ToolkitAPI/sampleLWCComponent/sampleLWCComponent.js

// VoiceCall Object reference
// https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_voicecall.htm
const FIELDS = ["VoiceCall.VendorCallKey"];
const SCV_EVENTS_TO_SUBSCRIBE = [scvEventNames.callconnected];

// SCV telephony config
const CONFIG = {
  // For this.platform = "servicecloud-voice", the Nice Business Unit Number
  // https://help.nicecxone.com/content/acd/businessunits/managebusinessunit.htm
  niceBusNo: "4610247" // TODO: make sure this matches your Nice CXone Business Unit Number.
};

const ServiceCloudVoiceMixin = (BaseClass) =>
  class extends BaseClass {
    @wire(getRecord, { recordId: "$recordId", fields: FIELDS }) voiceCall;

    get VendorCallKey() {
      return this.voiceCall.data.fields.VendorCallKey.value;
    }

    constructor() {
      super();
      this.telephonyEventListener = this.onTelephonyEvent.bind(this);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Init & Teardown
    ////////////////////////////////////////////////////////////////////////////

    initServiceCloudVoice() {
      // Set up Agent Assist UIM to work with Service Cloud Voice.
      this.debugLog("initServiceCloudVoice called");
      this.debugLog(`this.VendorCallKey: ${this.VendorCallKey}`);
      const toolkitApi = this.refs.serviceCloudVoiceToolkitApi;
      this.unsubscribeFromVoiceToolkit(toolkitApi, this.telephonyEventListener);
      this.subscribeToVoiceToolkit(toolkitApi, this.telephonyEventListener);
    }

    teardownServiceCloudVoice() {
      // Teardown Agent Assist UIM Service Cloud Voice.
      this.debugLog("teardownServiceCloudVoice called");
    }

    ////////////////////////////////////////////////////////////////////////////
    // Setup Event Listeners and Subscriptions
    ////////////////////////////////////////////////////////////////////////////

    subscribeToVoiceToolkit(toolkitApi, telephonyEventListener) {
      this.debugLog(`subscribeToVoiceToolkit: ${SCV_EVENTS_TO_SUBSCRIBE}`);
      for (const eventName of SCV_EVENTS_TO_SUBSCRIBE) {
        toolkitApi.addEventListener(eventName, telephonyEventListener);
      }
    }

    unsubscribeFromVoiceToolkit(toolkitApi, telephonyEventListener) {
      this.debugLog(`unsubscribeFromVoiceToolkit: ${SCV_EVENTS_TO_SUBSCRIBE}`);
      for (const eventName of SCV_EVENTS_TO_SUBSCRIBE) {
        toolkitApi.addEventListener(eventName, telephonyEventListener);
      }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Handle Events
    ////////////////////////////////////////////////////////////////////////////

    onTelephonyEvent(event) {
      this.debugLog(
        `[onTelephonyEvent ${event.type}]: ${JSON.stringify(event)}`
      );
      if (event.type === "callconnected") {
        // Compare the SCV telephony event's callId to SF VoiceCall record's VendorCallKey.
        // This is most likely also the BYOT telephony platform's external unique call id,
        // which can be used to construct telephony platform specific DF conversationName.
        this.debugLog(
          `this.VendorCallKey: ${this.VendorCallKey}, event.detail.callId: ${event.detail.callId}`
        );
        if (this.VendorCallKey === event.detail.callId) {
          if (this.scvTelephonyCheck.isNice) {
            this.generateNiceConversationName(event.detail.callId);
          } else {
            this.debugLog("Unsupported SCV telephony platform.");
          }
        }
      }
    }

    generateNiceConversationName(callId) {
      // Generate Nice CXone (Agent Assist Hub) formatted conversationName.
      const prefix = this.conversationProfile.split("/conversationProfiles")[0];
      this.conversationId = `BusNo-${CONFIG.niceBusNo}_ContactId-${callId}`;
      this.conversationName = `${prefix}/conversations/${this.conversationId}`;
    }
  };

export default ServiceCloudVoiceMixin;
