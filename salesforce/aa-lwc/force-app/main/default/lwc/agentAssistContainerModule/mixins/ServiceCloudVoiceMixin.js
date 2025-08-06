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

const FIELDS = [
  "VoiceCall.CallType",
  "VoiceCall.FromPhoneNumber",
  "VoiceCall.ToPhoneNumber"
];

// great examples here
// https://github.com/service-cloud-voice/examples-from-doc/blob/main/ToolkitAPI/sampleLWCComponent/sampleLWCComponent.js

const ServiceCloudVoiceMixin = (BaseClass) =>
  class extends BaseClass {
    @wire(getRecord, { recordId: "$recordId", fields: FIELDS }) voiceCall;

    initServiceCloudVoice() {
      this.debugLog('initServiceCloudVoice called')
    }

    teardownServiceCloudVoice() {
      this.debugLog('teardownServiceCloudVoice called')
    }


    scvEventNames = [
      "callstarted",
      "callconnected",
      "callended",
      "hold",
      "resume",
      "mute",
      "unmute",
      "participantadded",
      "participantremoved",
      "conference",
      "swap",
      "pauserecording",
      "resumerecording",
      "transcript",
      "wrapupended",
      "flagraise",
      "flaglower"
    ];
    payload = '{"key": "value"}';
    teleEvent = "No events received yet.";
    transcript = "No transcripts received yet.";
    previewPhoneNumber = "";
    addParticipantPhoneNumber = "";
    sendDigits = "";
    comboBoxHoldValue = "Initial_Caller";
    comboBoxResumeValue = "Initial_Caller";
    comboBoxRemoveParticipantValue = "Agent";
    comboBoxContactTypeValue = "PhoneNumber";
    comboBoxAddParticipantContactTypeValue = "PhoneNumber";

    constructor() {
      super();
      this.telephonyEventListener = this.onTelephonyEvent.bind(this);
    }

    get CallType() {
      return this.voiceCall.data.fields.CallType.value;
    }

    get FromPhoneNumber() {
      return this.voiceCall.data.fields.FromPhoneNumber.value;
    }

    get ToPhoneNumber() {
      return this.voiceCall.data.fields.ToPhoneNumber.value;
    }

    getToolkitApi() {
      return this.refs.serviceCloudVoiceToolkitApi;
    }


    subscribeToVoiceToolkit(toolkitApi, telephonyEventListener) {
      for (const eventName of this.scvEventNames) {
        toolkitApi.addEventListener(eventName, telephonyEventListener);
      }
    }

    unsubscribeFromVoiceToolkit(toolkitApi, telephonyEventListener) {
      for (const eventName of this.scvEventNames) {
        toolkitApi.addEventListener(eventName, telephonyEventListener);
      }
    }

    initServiceCloudVoice() {
      console.log("initServiceCloudVoice called for AgentAssistContainerDev");
      const toolkitApi = this.getToolkitApi();
      this.unsubscribeFromVoiceToolkit(toolkitApi, this.telephonyEventListener);
      this.subscribeToVoiceToolkit(toolkitApi, this.telephonyEventListener);
    }

    get options() {
      return [
        { label: "INITIAL_CALLER", value: "Initial_Caller" },
        { label: "THIRD_PARTY", value: "Third_Party" }
      ];
    }

    get endCallOptions() {
      return [
        { label: "AGENT", value: "Agent" },
        { label: "INITIAL_CALLER", value: "Initial_Caller" },
        { label: "THIRD_PARTY", value: "Third_Party" }
      ];
    }

    get contactOptions() {
      return [
        { label: "PHONE NUMBER", value: "PhoneNumber" },
        { label: "AGENT/QUEUE ID", value: "AgentOrQueueId" }
      ];
    }

    onTelephonyEvent(event) {
      console.log(`[onTelephonyEvent] ${event.type}:`, event);
      if (event.type === "callconnected") {
        this.conversationId = `nice-${event.detail.callId}`;
        console.log("this.conversationId", this.conversationId);
      }
      if (
        (event.type === "callstarted" || event.type === "callconnected") &&
        this.comboBoxRemoveParticipantValue === "Agent"
      ) {
        this.isTelephonyActionControlsDisabled = false;
      }
      if (event.type === "callended") {
        this.isTelephonyActionControlsDisabled = true;
      }
      if (event.type === "transcript") {
        this.transcript = JSON.stringify(event.detail);
      }
      this.teleEvent = JSON.stringify(event);
    }
  };

export default ServiceCloudVoiceMixin;
