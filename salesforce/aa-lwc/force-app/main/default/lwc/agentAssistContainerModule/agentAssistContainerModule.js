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

import { LightningElement, wire, api } from "lwc";
import { MessageContext } from "lightning/messageService";
import { loadScript } from "lightning/platformResourceLoader";
import container from "@salesforce/resourceUrl/container";
import transcript from "@salesforce/resourceUrl/transcript";
import google_logo from "@salesforce/resourceUrl/google_logo";

import integration from "./helpers/integration";
import messageChannels from "./helpers/messageChannels";

// This ZoneJS patch must be disabled for UI modules to work with Lightning Web Security.
window.__Zone_disable_on_property = true;

export default class AgentAssistContainerModule extends LightningElement {
  @api recordId;
  @wire(MessageContext) messageContext;

  // Configure these values in Lightning App Builder:
  // Drag and drop agentAssistContainerModule onto the page, select, fill inputs
  @api endpoint; // e.g. https://your-ui-connector-endpoint.a.run.app
  @api features; // e.g. CONVERSATION_SUMMARIZATION,KNOWLEDGE_ASSIST_V2,SMART_REPLY,AGENT_COACHING (https://cloud.google.com/agent-assist/docs/ui-modules-container-documentation)
  @api conversationProfile; // e.g. projects/your-gcp-project-id/locations/your-location/conversationProfiles/your-conversation-profile-id
  @api consumerKey; // SF Connected App Consumer Key
  @api consumerSecret; // SF Connected App Consumer Secret

  developmentMode = false;
  googleLogoUrl = google_logo;
  token = null;
  conversationId = null;
  conversationName = null;
  participants = null;
  loadError = null;

  connectedCallback() {
    integration.checkConfiguration(
      this.endpoint, this.features, this.conversationProfile, this.consumerKey,
      this.consumerSecret, this.developmentMode);
  }
  disconnectedCallback() {
    messageChannels.unsubscribeToMessageChannels();
    window._uiModuleEventTarget = window._uiModuleEventTarget.cloneNode(true)
  }

  async renderedCallback() {
    if (this.loadError) return

    await Promise.all([
      loadScript(this, container),
      loadScript(this, transcript)
    ]);

    try {
      this.token = await integration.registerAuthToken(
        this.consumerKey, this.consumerSecret, this.endpoint);
      this.conversationId = `SF-${this.recordId}`;
      messageChannels.subscribeToMessageChannels(
        this.recordId, this.developmentMode, this.conversationName, this.features,
        this.conversationId, this.messageContext);
    } catch (error) {
      this.loadError = new Error(`Got error: "${error.message}". Unable to authorize, please check your SF Trusted URLs, console, and configuration.`)
    }

    try {
      this.project = this.conversationProfile.match(
        /projects\/(?<p>[\w-_]+)/
      ).groups.p;
      this.location = this.conversationProfile.match(
        /locations\/(?<l>[\w-_]+)/
      ).groups.l;
    } catch (error) {
      this.loadError = new Error(`"${this.conversationProfile}" is not a valid conversation profile.
        Expected format: projects/<projectId>/locations/<location>/conversationProfiles/<conversationProfileId>`);
    }
    this.conversationName = `projects/${this.project}/locations/${this.location}/conversations/${this.conversationId}`;

    this.initAgentAssistEvents()

    // Optionally enable helpful console logs and conversation transcript
    if (this.developmentMode) {
      console.log("this:", JSON.stringify(this));
      console.log(`this.conversationName: ${this.conversationName}`);
      console.log(`this.recordId: ${this.recordId}`);
      console.log(`this.token: ${this.token}`);
      integration.initEventDragnet(this.recordId); // Log all Agent Assist events.

      // Create transcript element
      const transcriptContainerEl = this.template.querySelector(
        ".agent-assist-transcript"
      );
      const transcriptEl = document.createElement("agent-assist-transcript");
      transcriptEl.setAttribute("namespace", this.recordId);
      transcriptContainerEl.appendChild(transcriptEl);
    }

    // Create container element
    const containerEl = document.createElement("agent-assist-ui-modules");
    // Lightning Web Security blocks access to document.fullscreenElement,
    // which is needed for default UI Module copy to clipboard functionality.
    // Setting this causes copy-to-clipboard events to be emitted, which the
    // LWC then handles in integration.handleCopyToClipboard.
    containerEl.generalConfig = { clipboardMode: "EVENT_ONLY" };
    const containerContainerEl = this.template.querySelector(
      ".agent-assist-container"
    );
    let attributes = [
      ["features", this.features],
      ["namespace", this.recordId],
      ["conversation-profile", this.conversationProfile],
      ["custom-api-endpoint", this.endpoint],
      ["channel", "chat"],
      ["agent-desktop", "Custom"],
      ["auth-token", this.token],
      ["use-custom-conversation-id", "true"]
    ];
    attributes.forEach((attr) => containerEl.setAttribute(attr[0], attr[1]));
    containerContainerEl.appendChild(containerEl);
  }

  initAgentAssistEvents() {
    addAgentAssistEventListener(
      "api-connector-initialized",
      (event) => integration.handleApiConnectorInitialized(
        event, this.developmentMode, this.conversationName, this.recordId),
      { namespace: this.recordId }
    );
    addAgentAssistEventListener(
      "conversation-initialized",
      (event) => {
        this.participants = event.detail.participants;
        integration.reconcileConversationLogs(
          this.unusedEvent,
          this.refs.lwcToolKitApi,
          this.recordId,
          this.developmentMode,
          this.conversationId,
          this.conversationName);
      },
      { namespace: this.recordId }
    );
    addAgentAssistEventListener(
      "smart-reply-selected",
      (event) => integration.handleSmartReplySelected(
        event, this.refs.lwcToolKitApi, this.recordId),
      { namespace: this.recordId }
    );
    addAgentAssistEventListener(
      "agent-coaching-response-selected",
      (event) => integration.handleAgentCoachingResponseSelected(
        event, this.refs.lwcToolKitApi, this.recordId),
      { namespace: this.recordId }
    );
    addAgentAssistEventListener(
      "copy-to-clipboard",
      (event) => integration.handleCopyToClipboard(event, this.developmentMode),
      { namespace: this.recordId }
    );
  }
}
