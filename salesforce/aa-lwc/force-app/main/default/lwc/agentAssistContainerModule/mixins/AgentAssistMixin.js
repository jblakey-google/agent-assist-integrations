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
import sampleContext from "../data/sampleContext";

const AgentAssistMixin = (BaseClass) =>
  class extends BaseClass {
    ////////////////////////////////////////////////////////////////////////////
    // AUTH & INIT UI MODULES
    ////////////////////////////////////////////////////////////////////////////

    async registerAuthToken() {
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

      this.debugLog("access_token", access_token);

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

    initUIModules() {
      this.debugLog("initUIModules called");

      // Create Transcript UI Module.
      if (this.showTranscript) {
        const transcriptContainerEl = this.refs.agentAssistTranscript;
        const transcriptEl = document.createElement("agent-assist-transcript");
        transcriptEl.setAttribute("namespace", this.recordId);
        transcriptContainerEl.appendChild(transcriptEl);
      }

      // Create Container UI Module element.
      const containerEl = document.createElement("agent-assist-ui-modules-v2");
      containerEl.generalConfig = { clipboardMode: "EVENT_ONLY" };
      containerEl.classList.add("agent-assist-ui-modules");
      const containerContainerEl = this.refs.agentAssistContainer;
      containerEl.setAttribute("features", this.features);
      containerEl.setAttribute("namespace", this.recordId);

      // Create the UI Modules Connector.
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
          this.debugLog("UiModulesConnector initialized with config:");
          console.log(config);
        }

        // Check if Dark Mode is (still) on from another UIM instance
        if (document.body.classList.contains("dark-mode")) {
          this.handleDarkModeToggled({ detail: { on: true } });
        }

        // Make the UI Modules visible
        containerContainerEl.classList.remove("hidden");
        if (this.showTranscript) {
          const transcriptContainerEl = this.refs.transcriptContainer;
          transcriptContainerEl.classList.remove("hidden");
        }
      }
    }

    ////////////////////////////////////////////////////////////////////////////
    // HANDLE UI MODULE EVENTS
    ////////////////////////////////////////////////////////////////////////////

    initAgentAssistEvents() {
      // Add event listeners for Agent Assist UI Modules events.
      addAgentAssistEventListener(
        "api-connector-initialized",
        () => this.handleApiConnectorInitialized(),
        { namespace: this.recordId }
      );
      addAgentAssistEventListener(
        "copy-to-clipboard",
        (event) => this.handleCopyToClipboard(event),
        { namespace: this.recordId }
      );
      addAgentAssistEventListener(
        "dark-mode-toggled",
        (event) => this.handleDarkModeToggled(event),
        { namespace: this.recordId }
      );
    }

    handleApiConnectorInitialized() {
      // Set the active conversation for UIM on API connector initialization.
      dispatchAgentAssistEvent(
        "active-conversation-selected",
        { detail: { conversationName: this.conversationName } },
        { namespace: this.recordId }
      );
    }

    async handleCopyToClipboard(event) {
      // Handle copy to clipboard event from UI Modules.
      navigator.clipboard.writeText(event.detail.textToCopy);
    }

    handleDarkModeToggled(event) {
      // Toggle dark mode for the transcript container.
      if (event.detail.on) {
        this.refs.transcriptContainer.classList.add("dark-mode");
      } else {
        this.refs.transcriptContainer.classList.remove("dark-mode");
      }
    }

    ////////////////////////////////////////////////////////////////////////////
    // GENERATE CONVERSATION NAME OR FETCH ONE FROM UI CONNECTOR
    ////////////////////////////////////////////////////////////////////////////

    generateConversationName() {
      // Generate a Dialogflow conversation name.
      // Works when the Dialogflow conversation isn't created outside SF.
      let prefix = this.conversationProfile.split("/locations")[0];
      this.conversationId = `SF-${this.recordId}`;
      this.conversationName = `${prefix}/conversations/${this.conversationId}`;
      this.debugLog(`this.conversationName - ${this.conversationName}`);
    }

    createRequestOptions(method, body = null) {
      // Construct fetch authed request options object
      const options = {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `${this.token}`
        }
      };
      if (body) options.body = body;
      return options;
    }

    async getConversationName(conversationIntegrationKey) {
      // Gets conversationName from Redis using conversationIntegrationKey.
      // Presence intended to trigger UI Module init for CTI add-on based integrations.
      this.conversationName = await fetch(
        this.endpoint +
          "/conversation-name?conversationIntegrationKey=" +
          conversationIntegrationKey,
        this.createRequestOptions("GET")
      )
        .then((res) => {
          if (res.status !== 200) {
            this.debugLog(`getConversationName: ${res}`);
          }
          return res.json();
        })
        .then((data) => data.conversationName)
        .catch((err) => {
          if (!err.status === 404) console.error(err);
        });
    }

    async deleteConversationName(conversationIntegrationKey) {
      // Deletes conversationIntegrationKey:conversationName pair from Redis.
      return await fetch(
        this.endpoint +
          "/conversation-name?conversationIntegrationKey=" +
          conversationIntegrationKey,
        this.createRequestOptions("DELETE")
      )
        .then((res) => this.debugLog(`deleteConversationName: ${res.status}`))
        .catch((err) => console.error(err));
    }

    async isConversationCompleted(conversationIntegrationKey) {
      // Checks if this.conversationName is COMPLETED.
      return await fetch(
        `${this.endpoint}/v2/${this.conversationName}`,
        this.createRequestOptions("GET")
      )
        .then((res) => res.json())
        .then((conversation) => {
          if (conversation.lifecycleState === "COMPLETED") {
            this.debugLog(`conversation COMPLETED, deleting key from redis.`);
            this.deleteConversationName(conversationIntegrationKey);
            return true;
          }
        });
    }

    async pollForConversationName(
      conversationIntegrationKey,
      milliseconds = 5000
    ) {
      // Continuously poll by conversationIntegrationKey for a conversationName in Redis.
      this.conversationName = undefined;
      let pollingInterval = setInterval(async () => {
        this.debugLog(
          `polling for conversationName with ${conversationIntegrationKey}...`
        );
        this.getConversationName(conversationIntegrationKey);
        if (this.conversationName) {
          this.debugLog(`found conversationName: ${this.conversationName}`);
          if (
            !(await this.isConversationCompleted(conversationIntegrationKey))
          ) {
            this.debugLog(
              `conversationName is not COMPLETED, init UI Modules.`
            );
            clearInterval(pollingInterval);
            this.handleApiConnectorInitialized();
            this.initUIModules();
          }
        }
      }, milliseconds);
    }

    ////////////////////////////////////////////////////////////////////////////
    // DEBUG & DEMO
    ////////////////////////////////////////////////////////////////////////////

    debugLog(message) {
      // A debug utility to log messages only if debugMode is set to true.
      if (this.debugMode) {
        console.log(`%c[AgentAssist]: ${message}`, "background-color: #9ff");
      }
    }

    inspectConfig() {
      // A debug utility to check the runtime config of the Agent Assist LWC.
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
        // this.debugLog(`initEventDragnet - listening for ${eventName}`);
        try {
          addAgentAssistEventListener(
            eventName,
            (event) => {
              this.debugLog(`initEventDragnet - heard: ${event.type}`);
              if (event.detail) {
                console.log(event.detail);
              }
            },
            { namespace: this.recordId }
          );
        } catch (error) {
          console.error(error);
        }
      });
    }

    ingestDemoContextReferences() {
      // Injects context into the Dialogflow conversation for demos and testing.
      // https://cloud.google.com/dialogflow/es/docs/reference/rest/v2/projects.locations.conversations/ingestContextReferences
      const injectContext = () => {
        let url = `${this.endpoint}/v2/${this.conversationName}:ingestContextReferences`;
        let body = JSON.stringify({
          contextReferences: {
            context: {
              contextContents: [
                { content: sampleContext, contentFormat: "JSON" }
              ],
              languageCode: "en-us",
              updateMode: "OVERWRITE"
            }
          }
        });
        fetch(url, this.createRequestOptions("POST", body))
          .then((res) => res.text())
          .then((data) => {
            this.debugLog("ingestDemoContextReferences ran successfully");
            console.log(JSON.parse(data));
          })
          .catch((err) => console.error(err));
      };
      setTimeout(injectContext, 1000);
    }
  };

export default AgentAssistMixin;
