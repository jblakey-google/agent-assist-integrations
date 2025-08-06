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

import agentAssistEventNames from "../data/agentAssistEventNames";

const AgentAssistMixin = (BaseClass) =>
  class extends BaseClass {
    async registerAuthToken(consumerKey, consumerSecret, endpoint) {
      // Get a UI Connector auth token using a SF External Client App id token.
      const access_token = await fetch(
        `/services/oauth2/token?` +
          new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.consumerKey,
            client_secret: this.consumerSecret
          })
      )
        .then((res) => res.json())
        .then((data) => data.access_token)
        .catch((err) => console.error(err));

      return await fetch(this.endpoint + "/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`
        }
      })
        .then((res) => res.json())
        .then((data) => data.token)
        .catch((err) => console.error(err));
    }

    handleApiConnectorInitialized(event) {
      // Set the active conversation for UIM on API connector initialization.
      dispatchAgentAssistEvent(
        "active-conversation-selected",
        { detail: { conversationName: this.conversationName } },
        { namespace: this.recordId }
      );
    }

    async handleCopyToClipboard(event) {
      navigator.clipboard.writeText(event.detail.textToCopy);
    }

    async delConversationName(contactPhone) {
      // Deletes conversationIntegrationKey:conversationName pair from Redis.
      // For voice channel, deleting this key allows the UI Modules to start polling for a new conversation.
      return await fetch(
        this.endpoint +
          "/conversation-name?conversationIntegrationKey=" +
          this.contactPhone,
        {
          method: "DELETE",
          headers: { Authorization: `${this.token}` }
        }
      )
        .then((res) => {
          if (!res.ok) {
            throw new Error(res.status);
          }
        })
        .catch((err) => console.error("Fetch error:", err));
    }

    async getConversationName(contactPhone) {
      // Gets conversationName from Redis using conversationIntegrationKey.
      // Presence intended to trigger UI Module init for CTI add-on based integrations.
      let conversationName = await fetch(
        endpoint +
          "/conversation-name?conversationIntegrationKey=" +
          contactPhone,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: this.token
          }
        }
      )
        .then((res) => res.json())
        .then((data) => data.conversationName)
        .catch((err) => {
          if (!err.status === 404) {
            console.error(err);
          }
        });
      if (!conversationName) return null;
      // TODO: Remove if possible
      // If conversation status is completed, DELETE from Redis.
      // return await fetch(endpoint + "/v2/" + conversationName, getOptions)
      //   .then((res) => res.json())
      //   .then((conversation) => {
      //     console.log(
      //       "conversation lifecycle state:",
      //       conversation.lifecycleState
      //     );
      //     if (conversation.lifecycleState !== "COMPLETED" || debugMode) {
      //       return conversation.name;
      //     }
      //     delConversationName(token, endpoint, contactPhone);
      //   })
      //   .catch((err) => console.error(err));
    }

    initAgentAssistEvents() {
      addAgentAssistEventListener(
        "api-connector-initialized",
        (event) => this.handleApiConnectorInitialized(event),
        { namespace: this.recordId }
      );
      // TODO: Remove if possible
      // addAgentAssistEventListener(
      //   "conversation-initialized",
      //   (event) => {
      //     this.participants = event.detail.participants;
      //   },
      //   { namespace: this.recordId }
      // );
      addAgentAssistEventListener(
        "copy-to-clipboard",
        (event) => integration.handleCopyToClipboard(event),
        { namespace: this.recordId }
      );
    }

    initUIModules() {
      // Create Transcript UI Module
      if (this.showTranscript) {
        const transcriptContainerEl = this.template.querySelector(
          ".agent-assist-transcript"
        );
        console.log(transcriptContainerEl)
        const transcriptEl = document.createElement("agent-assist-transcript");
        transcriptEl.setAttribute("namespace", this.recordId);
        transcriptContainerEl.appendChild(transcriptEl);
      }

      // Create Container UI Module
      const containerEl = document.createElement("agent-assist-ui-modules-v2");
      containerEl.generalConfig = { clipboardMode: "EVENT_ONLY" };
      containerEl.classList.add("agent-assist-ui-modules");
      const containerContainerEl = this.template.querySelector(
        ".agent-assist-container"
      );
      // TODO: Some of these can be removed?? UIM V2?
      let attributes = [
        ["agent-desktop", "Custom"],
        ["auth-token", this.token],
        ["channel", this.channel],
        ["conversation-profile", this.conversationProfile],
        ["custom-api-endpoint", this.endpoint],
        ["event-based-library", "SocketIo"],
        ["features", this.features],
        ["namespace", this.recordId],
        ["notifier-server-endpoint", this.endpoint],
        ["omit-script-nonce", "true"]
      ];
      console.log(attributes)

      attributes.forEach((attr) => containerEl.setAttribute(attr[0], attr[1]));

      // Create the UI Modules Connector
      const connector = new UiModulesConnector();
      const config = {};
      // Basic config
      config.channel = this.channel;
      config.features = this.features;
      config.agentDesktop = "Custom";
      config.conversationProfileName = this.conversationProfile;
      // Connector options
      config.apiConfig = {
        authToken: this.token,
        customApiEndpoint: this.endpoint
      };
      config.eventBasedConfig = {
        notifierServerEndpoint: this.endpoint,
        library: "SocketIo"
      };
      // Salesforce specific config
      config.uiModuleEventOptions = {
        namespace: this.recordId
      };
      config.omitScriptNonce = true;

      // Initialize the UI Modules
      if (this.conversationName) {
        containerContainerEl.appendChild(containerEl); // TODO: Weird error here about addEventListener not accepting options on Shadow nodes... only in debug mode though?
        connector.init(config);
        if (this.debugMode) {
          this.debugLog("UiModulesConnector initialized with connector:");
          console.log(connector)
        }
        // Make the UiM elements visible and hide the empty state
        containerContainerEl.classList.remove("hidden");
        if (this.showTranscript) {
          const transcriptContainerEl = this.template.querySelector(
            ".transcript-container"
          );
          transcriptContainerEl.classList.remove("hidden");
        }
      }
    }

    debugLog(message) {
      console.log(`%c[AgentAssist]: ${message}`, "background-color: #9ff");
    }

    inspectConfig() {
      this.debugLog(`this.endpoint - ${this.endpoint}`);
      this.debugLog(`this.features - ${this.features}`);
      this.debugLog(`this.showTranscript - ${this.showTranscript}`);
      this.debugLog(`this.conversationProfile - ${this.conversationProfile}`);
      this.debugLog(`this.channel - ${this.channel}`);
      this.debugLog(`this.platform - ${this.platform}`);
      this.debugLog(
        `this.platformCheck - ${JSON.stringify(this.platformCheck)}`
      );
      this.debugLog(`this.consumerKey - ${this.consumerKey}`);
      this.debugLog(`this.consumerSecret - ${this.consumerSecret}`);
    }

    initEventDragnet() {
      // A debug utility to listen for and log every Agent Assist event type.
      this.debugLog(
        `InitEventDragnet - listening for ${agentAssistEventNames.length} event types...`
      );
      agentAssistEventNames.forEach((eventName) => {
        addAgentAssistEventListener(
          eventName,
          (event) => {
            this.debugLog(`initEventDragnet - heard: ${event.type}`);
            console.log(event)
          },
          { namespace: this.recordId }
        );
      });
    }
  };

export default AgentAssistMixin;

// Possibly everything below this line can be left out.

// import sampleContext from "../data/sampleContext";
// ingestDemoContextReferences() {
//   // This function is a demo to show how to ingest context references.
//   // It injects hardcoded context into the agent assist container module.
//   // This is useful for testing purposes and should not be used in production.
//   const injectContext = () => {
//     console.log("ingestDemoContextReferences: STARTED");
//     let url = `${this.endpoint}/v2/${this.conversationName}:ingestContextReferences`;
//     let method = "POST";
//     let headers = {
//       Authorization: this.token,
//       "Content-Type": "application/json"
//     };
//     let body = JSON.stringify({
//       contextReferences: {
//         context: {
//           contextContents: [
//             { content: sampleContext, contentFormat: "JSON" }
//           ],
//           languageCode: "en-us",
//           updateMode: "OVERWRITE"
//         }
//       }
//     });
//     fetch(url, { method, headers, body })
//       .then((res) => res.text())
//       .then((data) => console.log(data))
//       .catch((err) => console.error(err));
//     console.log("ingestDemoContextReferences: COMPLETED");
//   };
//   setTimeout(injectContext, 1000);
// }
