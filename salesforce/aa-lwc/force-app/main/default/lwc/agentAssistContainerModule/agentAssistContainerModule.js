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

import google_logo from "@salesforce/resourceUrl/google_logo";
import ui_modules from "@salesforce/resourceUrl/ui_modules";
import { MessageContext } from "lightning/messageService";
import { loadScript } from "lightning/platformResourceLoader";
import { getRecord } from "lightning/uiRecordApi";
import { api, LightningElement, wire } from "lwc";

import conversationName from "./helpers/conversationName";
import integration from "./helpers/integration";
import messageChannels from "./helpers/messageChannels";

// This ZoneJS patch must be disabled for UI modules to work with Lightning Web Security.
window.__Zone_disable_on_property = true;
export default class AgentAssistContainerModule extends LightningElement {
  @api recordId;
  @wire(MessageContext) messageContext;
  @wire(getRecord, { recordId: "$recordId", fields: ["Contact.Phone"] }) contact;
  get contactPhone() {
    return this.contact.data.fields.Phone.value.replaceAll(/[^\d]/g, "");
  }

  // Configure these values in Lightning App Builder:
  // Drag and drop agentAssistContainerModule onto the page, select, fill inputs
  @api endpoint; // e.g. https://your-ui-connector-endpoint.a.run.app
  @api features; // e.g. CONVERSATION_SUMMARIZATION,KNOWLEDGE_ASSIST_V2,SMART_REPLY,AGENT_COACHING (https://cloud.google.com/agent-assist/docs/ui-modules-container-documentation)
  @api conversationProfile; // e.g. projects/your-gcp-project-id/locations/your-location/conversationProfiles/your-conversation-profile-id
  @api channel; // Either 'chat' or 'voice'
  @api consumerKey; // SF Connected App Consumer Key
  @api consumerSecret; // SF Connected App Consumer Secret

  debugMode = false;
  googleLogoUrl = google_logo;
  token = null;
  conversationId = null;
  conversationName = null;
  participants = null;
  loadError = null;

  connectedCallback() {
    integration.checkConfiguration(
      this.endpoint,
      this.features,
      this.conversationProfile,
      this.consumerKey,
      this.consumerSecret,
      this.debugMode
    );

    this.showTranscript = this.debugMode || this.channel === 'voice'
  }
  disconnectedCallback() {
    if (this.channel === "chat") {
      messageChannels.unsubscribeToMessageChannels();
    }
    window._uiModuleEventTarget = window._uiModuleEventTarget.cloneNode(true);
  }

  async renderedCallback() {
    if (this.loadError) return;
    await Promise.all([
      loadScript(this, ui_modules + "/container.js"),
      loadScript(this, ui_modules + "/transcript.js")
    ]);
    try {
      this.token = await integration.registerAuthToken(
        this.consumerKey,
        this.consumerSecret,
        this.endpoint
      );
      this.conversationId = `SF-${this.recordId}`;
      messageChannels.subscribeToMessageChannels(
        this.recordId,
        this.debugMode,
        this.conversationName,
        this.features,
        this.conversationId,
        this.messageContext
      );
    } catch (error) {
      this.loadError = new Error(
        `Got error: "${error.message}". Unable to authorize, please check your SF Trusted URLs, console, and configuration.`
      );
    }
    try {
      this.project = this.conversationProfile.match(
        /projects\/(?<p>[\w-_]+)/
      ).groups.p;
      this.location = this.conversationProfile.match(
        /locations\/(?<l>[\w-_]+)/
      ).groups.l;
    } catch (error) {
      this.loadError =
        new Error(`"${this.conversationProfile}" is not a valid conversation profile.
        Expected format: projects/<projectId>/locations/<location>/conversationProfiles/<conversationProfileId>`);
    }
    if (this.channel === "voice") {
      this.conversationName = await conversationName.getConversationName(
        this.token,
        this.endpoint,
        this.contactPhone
      );
    } else if (this.channel === "chat") {
      this.conversationName = `projects/${this.project}/locations/${this.location}/conversations/${this.conversationId}`;
    }
    this.initAgentAssistEvents();

    // Optionally enable helpful console logs
    if (this.debugMode) {
      console.log("this:", JSON.stringify(this));
      console.log(`this.recordId: ${this.recordId}`);
      console.log("this.channel", this.channel);
      if (this.channel === "voice") {
        console.log("this.contactPhone:", this.contactPhone);
      } else if (this.channel === "chat") {
        console.log("this.messageContext", this.messageContext);
      }
      console.log(`this.conversationName: ${this.conversationName}`);
      console.log(`this.token: ${this.token}`);
      integration.initEventDragnet(this.recordId); // Log all Agent Assist events.
    }

    // Create the LWC if conversationName is set, else show the empty state
    // Create a transcript of the Agent Assist conversation.
    if (this.showTranscript) {
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
      ["namespace", this.recordId],
      ["custom-api-endpoint", this.endpoint],
      ["channel", this.channel],
      ["agent-desktop", "Custom"],
      ["features", this.features],
      ["conversation-profile", this.conversationProfile],
      ["auth-token", this.token],
      ["omit-script-nonce", "true"]
    ];
    if (this.channel === "voice") {
      attributes.push(["notifier-server-endpoint", this.endpoint]);
      attributes.push(["event-based-library", "SocketIo"]);
    }
    attributes.forEach((attr) => containerEl.setAttribute(attr[0], attr[1]));

    const initializeUIM = () => {
      containerContainerEl.appendChild(containerEl);
      // Make the UiM elements visible and hide the empty state
      containerContainerEl.classList.remove("hidden");

      if (this.showTranscript) {
        // Make dynamic layout adjustments for transcript
        const transcriptContainerEl = this.template.querySelector(
          ".transcript-container"); // left
        transcriptContainerEl.classList.remove("hidden");

        const agentAssistComponentEl = this.template.querySelector('.agent-assist-component')
        const agentAssistContainerEl = this.template.querySelector(
          ".agent-assist-container"); // right
        const transcriptHeaderEl = transcriptContainerEl.querySelector('h3')
        const transcriptConversationEl = transcriptContainerEl.querySelector('.conversation-container')

        // Watch for resizes on modules and match transcript to  combined height
        const resizeObserver = new ResizeObserver(_ => {
          // Check if the transcript is taking the full width of the component
          if (parseInt(agentAssistComponentEl.clientWidth / transcriptConversationEl.clientWidth) === 1) {
            // Transcript is taking full width
            transcriptConversationEl.style.height = 'unset'
            transcriptConversationEl.style.maxHeight = 'calc(-20px + 25vh)'
          } else {
            // 'Transcript is not taking full width'
            transcriptConversationEl.style.height = '0px'
            transcriptConversationEl.style.maxHeight = 'unset'
            let newHeight = agentAssistContainerEl.scrollHeight - transcriptHeaderEl.scrollHeight - 3
            transcriptConversationEl.style.height = `${newHeight}px`
          }
        })
        const moduleWrappers = this.template.querySelectorAll('module-wrapper')
        moduleWrappers.forEach(wrapper => resizeObserver.observe(wrapper))

        // Auto-scroll the transcript when new messages appear
        const mutationObserver = new MutationObserver((records, observer) => {
          for (record of records) {
            let last = record.addedNodes[record.addedNodes.length - 1];
            last.scrollIntoView()
          }
        })
        mutationObserver.observe(transcriptConversationEl, { childList: true })

      }
    }

    if (this.conversationName) {
      initializeUIM();
    } else {
      if (this.debugMode) {
        console.log("No conversationName, cannot init Agent Assist UI Modules.");
      }
      if (this.channel === "voice") {
        if (this.debugMode) {
          console.debug("Polling for conversationName every 5 seconds...");
        }
        let interval = setInterval(async () => {
          this.conversationName = await conversationName.getConversationName(
            this.token,
            this.endpoint,
            this.contactPhone
          );
          if (this.conversationName) {
            if (this.debugMode) {
              console.debug(
                "Polling found conversationName:",
                this.conversationName
              );
            }
            clearInterval(interval);
            integration.handleApiConnectorInitialized(
              null, this.debugMode, this.conversationName, this.recordId),
            initializeUIM();
          }
        }, 5000);
      }
    }
  }

  initAgentAssistEvents() {
    addAgentAssistEventListener(
      "api-connector-initialized",
      (event) =>
        integration.handleApiConnectorInitialized(
          event,
          this.debugMode,
          this.conversationName,
          this.recordId
        ),
      { namespace: this.recordId }
    );
    addAgentAssistEventListener(
      "conversation-initialized",
      (event) => {
        this.participants = event.detail.participants;
        if (this.channel === "chat") {
          integration.reconcileConversationLogs(
            this.unusedEvent,
            this.refs.lwcToolKitApi,
            this.recordId,
            this.debugMode,
            this.conversationId,
            this.conversationName
          );
        }
      },
      { namespace: this.recordId }
    );
    addAgentAssistEventListener(
      "smart-reply-selected",
      (event) =>
        integration.handleSmartReplySelected(
          event,
          this.refs.lwcToolKitApi,
          this.recordId
        ),
      { namespace: this.recordId }
    );
    addAgentAssistEventListener(
      "agent-coaching-response-selected",
      (event) =>
        integration.handleAgentCoachingResponseSelected(
          event,
          this.refs.lwcToolKitApi,
          this.recordId
        ),
      { namespace: this.recordId }
    );
    addAgentAssistEventListener(
      "copy-to-clipboard",
      (event) => integration.handleCopyToClipboard(event, this.debugMode),
      { namespace: this.recordId }
    );
    if (this.channel === "voice") {
      addAgentAssistEventListener(
        "conversation-completed",
        async () => {
          dispatchAgentAssistEvent(
            "conversation-summarization-requested",
            { detail: { conversationName: this.conversationName } },
            { namespace: this.recordId }
          );
          await conversationName.delConversationName(
            this.token,
            this.endpoint,
            this.contactPhone
          );
        },
        { namespace: this.recordId }
      );
    }
  }
}
