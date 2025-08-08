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

import { LightningElement, api } from "lwc";
import { loadScript, loadStyle } from "lightning/platformResourceLoader";

// static resources
import ui_modules from "@salesforce/resourceUrl/ui_modules";
import global_styles from "@salesforce/resourceUrl/global_styles";
import google_logo from "@salesforce/resourceUrl/google_logo";

// lightning element mixins
import AgentAssistMixin from "./mixins/AgentAssistMixin";
import ServiceCloudVoiceMixin from "./mixins/ServiceCloudVoiceMixin";
import MessagingMixin from "./mixins/MessagingMixin";
import TwilioFlexMixin from "./mixins/TwilioFlexMixin";

// mix in methods to extend LightningElement
let AALightningElement = AgentAssistMixin(LightningElement);
AALightningElement = ServiceCloudVoiceMixin(AALightningElement);
AALightningElement = MessagingMixin(AALightningElement);
AALightningElement = TwilioFlexMixin(AALightningElement);

// This ZoneJS patch must be disabled for UI modules to work with Lightning Web Security.
window.__Zone_disable_on_property = true;
// Generally useful flags for UIM debugging and environment configuration.
// window._uiModuleFlags = { debug: true };

export default class AgentAssistContainerDev extends AALightningElement {
  @api recordId;
  // Configure these LWC properties in Lightning App Builder:
  // Drag and drop agentAssistContainerModule onto page, select, and fill inputs
  @api debugMode; // e.g. false
  @api endpoint; // e.g. https://your-ui-connector-endpoint.a.run.app
  @api features; // e.g. CONVERSATION_SUMMARIZATION,KNOWLEDGE_ASSIST_V2,SMART_REPLY,AGENT_COACHING (https://cloud.google.com/agent-assist/docs/ui-modules-container-documentation)
  @api conversationProfile; // e.g. projects/your-gcp-project-id/locations/your-location/conversationProfiles/your-conversation-profile-id
  @api channel; // Either 'chat' or 'voice'
  @api platform; // One of 'messaging', 'twilioflex', 'servicecloudvoice'
  @api consumerKey; // SF Connected App Consumer Key
  @api consumerSecret; // SF Connected App Consumer Secret

  googleLogoUrl = google_logo;
  loadError = null;
  conversationName = null;

  connectedCallback() {
    this.debugLog("connectedCallback called");

    // Before renderedCallback, work with UI Modules config
    this.platformCheck = {
      isServiceCloudVoice: this.platform === "servicecloudvoice",
      isTwilioFlex: this.platform === "twilioflex",
      isMessaging: this.platform === "messaging"
    };
    this.showTranscript = this.channel === "voice" || this.debugMode;
    this.inspectConfig();
  }

  async renderedCallback() {
    this.debugLog("renderedCallback called");

    // Get a UI Connector auth token
    this.token = await this.registerAuthToken(
      this.consumerKey,
      this.consumerSecret,
      this.endpoint
    );

    // Load static resources
    await Promise.all([
      loadScript(this, ui_modules + "/container.js"),
      loadScript(this, ui_modules + "/transcript.js"),
      loadScript(this, ui_modules + "/common.js"),
      loadStyle(this, global_styles)
    ]);

    // Initialize Agent Assist UI Modules
    this.initAgentAssistEvents();
    if (this.debugMode) this.initEventDragnet();
    if (this.platformCheck.isMessaging) {
      this.initMessaging();
    } else if (this.platformCheck.isTwilioFlex) {
      await this.initTwilioFlex();
    } else if (this.platformCheck.isServiceCloudVoice) {
      this.initServiceCloudVoice();
    }
    this.debugLog(`this.conversationName: ${this.conversationName}`);
    if (this.conversationName) this.initUIModules();
    // this.ingestDemoContextReferences(); // For demo and testing purposes
  }

  disconnectedCallback() {
    this.debugLog("disconnectedCallback called");

    // Teardown platform specific setup
    if (this.platformCheck.isMessaging) {
      this.teardownMessaging();
    } else if (this.platformCheck.isTwilioFlex) {
      this.teardownTwilioFlex();
    } else if (this.platformCheck.isServiceCloudVoice) {
      this.teardownServiceCloudVoice();
    }

    // Clears all listeners (_uiModuleEventTarget is not attached to the DOM)
    if (window._uiModuleEventTarget) {
      window._uiModuleEventTarget = window._uiModuleEventTarget.cloneNode(true);
    }
  }
}
