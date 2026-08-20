/**
 * Copyright 2026 Google LLC
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

import BasePlatformService from './BasePlatformService';

export default class GenesysCloudPlatformService extends BasePlatformService {
  pollingTimeout = null;
  isTeardown = false;
  genesysConversationId = null;

  constructor(lwc, refs) {
    super(lwc, refs);
    this.handleConversationEndedForGenesysCloud = this.handleConversationEndedForGenesysCloud.bind(this);
    this.handleGenesysMessage = this.handleGenesysMessage.bind(this);
  }

  async init() {
    this.lwc.debugLog('initGenesysCloud called');

    // Listen for postMessage updates broadcasted by the Genesys CTI framework
    window.addEventListener('message', this.handleGenesysMessage);

    // Wait for Genesys CTI conversation ID to be available
    if (!this.genesysConversationId) {
      this.lwc.debugLog('Waiting for Genesys conversation ID from CTI event...');
      await this.waitForGenesysConversationId();
    }
    if (this.isTeardown || !this.genesysConversationId) return;

    const conversationName = await this.fetchConversationName(this.genesysConversationId);
    if (this.isTeardown) return;
    this.lwc.conversationName = conversationName;

    if (
      !this.lwc.conversationName ||
      (await this.isConversationCompleted(this.genesysConversationId))
    ) {
      if (this.isTeardown) return;
      this.pollForConversationNameByIntegrationKey(this.genesysConversationId);
    }
    if (this.isTeardown) return;
    this.listenToAgentAssistEventsForGenesysCloud();
  }

  handleGenesysMessage(event) {
    try {
      const payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      
      // Check for Genesys interaction subscription events
      if (payload && (payload.type === 'interactionSubscription' || payload.type === 'PureCloud.Interaction')) {
        const interaction = payload.data?.interaction || payload.data;
        if (interaction && interaction.id) {
          const newConversationId = interaction.id;
          if (this.genesysConversationId !== newConversationId) {
            this.genesysConversationId = newConversationId;
            this.lwc.debugLog(`Received Genesys conversation ID from CTI event: ${newConversationId}`);
            
            // If we are already polling or don't have a conversation yet, switch to the new ID
            if (this.pollingTimeout) {
              clearTimeout(this.pollingTimeout);
              this.pollForConversationNameByIntegrationKey(newConversationId);
            } else if (!this.lwc.conversationName) {
              this.pollForConversationNameByIntegrationKey(newConversationId);
            }
          }
        }
      }
    } catch (e) {
      // Handle non-JSON or unrelated window messages gracefully
    }
  }

  async waitForGenesysConversationId() {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.genesysConversationId || this.isTeardown) {
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
  }

  teardown() {
    this.isTeardown = true;
    super.teardown();
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }
    window.removeEventListener('message', this.handleGenesysMessage);
  }

  listenToAgentAssistEventsForGenesysCloud() {
    this.lwc.debugLog('listenToAgentAssistEventsForGenesysCloud called');
    addAgentAssistEventListener(
      "conversation-completed",
      this.handleConversationEndedForGenesysCloud,
      { namespace: this.lwc.recordId },
    );
  }

  async fetchConversationName(conversationIntegrationKey, timeout = 5000) {
    if (!conversationIntegrationKey) {
      this.lwc.debugLog('fetchConversationName called with empty integration key');
      return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(
        this.lwc.endpoint +
           '/conversation-name?conversationIntegrationKey=' +
           encodeURIComponent(conversationIntegrationKey),
        { ...this.createRequestOptions('GET'), signal: controller.signal },
      );

      if (response?.ok) {
        const data = await response.json();
        return data.conversationName;
      } else if (response && response.status !== 404) {
        this.lwc.debugLog(
          `Error fetching conversation name: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      this.lwc.debugLog(
        `Network error fetching conversation name: ${error.message}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }
    return null;
  }

  async pollForConversationNameByIntegrationKey(
    conversationIntegrationKey,
    {
      initialDelay = 1000,
      maxDelay = 10000,
      requestTimeoutMs = 9900,
    } = {},
  ) {
    if (!conversationIntegrationKey) {
      this.lwc.debugLog('pollForConversationNameByIntegrationKey called with empty integration key');
      return;
    }

    this.lwc.conversationName = undefined;
    let attempt = 0;

    const poll = async (delayMs) => {
      if (this.isTeardown) return;
      attempt++;
      this.lwc.debugLog(`Polling for conversationName... (attempt ${attempt}, delay: ${delayMs}ms)`);

      try {
        const conversationName = await this.fetchConversationName(
          conversationIntegrationKey,
          requestTimeoutMs,
        );
        if (this.isTeardown) return;

        if (
          conversationName &&
          !(await this.isConversationCompleted(conversationIntegrationKey))
        ) {
          if (this.isTeardown) return;
          this.lwc.conversationName = conversationName;
          this.lwc.debugLog(`Found conversationName: ${this.lwc.conversationName}. Initializing UI Modules.`);
          this.handleConnectorInitialized();
          this.initUIModules();
          return;
        } else {
          throw new Error('Conversation not found or already completed.');
        }
      } catch (error) {
        if (this.isTeardown) return;
        this.lwc.debugLog(`Polling attempt ${attempt} failed: ${error.message}`);

        const increment = (maxDelay - initialDelay) / 10;
        const nextDelay = Math.min(maxDelay, delayMs + increment);

        this.pollingTimeout = setTimeout(() => poll(nextDelay), delayMs);
      }
    };

    poll(initialDelay);
  }

  handleConversationEndedForGenesysCloud() {
    if (this.isTeardown) return;
    this.lwc.debugLog("handleConversationEndedForGenesysCloud called");
    if (this.lwc.features && this.lwc.features.includes("CONVERSATION_SUMMARIZATION")) {
      this.lwc.triggerSummarization();
    }
    if (this.genesysConversationId) {
      this.pollForConversationNameByIntegrationKey(this.genesysConversationId);
    }
  }
}
