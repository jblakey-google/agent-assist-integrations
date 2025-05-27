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

import AgentAssistContainerModule from "c/agentAssistContainerModule";
import { createElement } from "lwc";
import { loadScript } from "lightning/platformResourceLoader";
import { getRecord } from "lightning/uiRecordApi";
import * as conversationNameHelper from "./../helpers/conversationName.js";
import * as integrationHelper from "./../helpers/integration.js";
import * as messageChannelsHelper from "./../helpers/messageChannels.js";

// Mocking the platformResourceLoader
jest.mock(
  "lightning/platformResourceLoader",
  () => {
    return {
      loadScript: jest.fn(() => Promise.resolve()),
    };
  },
  { virtual: true }
);

// Mocking the messageService related imports if they were directly used in the LWC
// For this component, messageContext is wired, and subscribe/unsubscribe are in messageChannels.js
jest.mock(
  "lightning/messageService",
  () => {
    return {
      MessageContext: jest.fn(), // Mock the context wire adapter
      // subscribe, unsubscribe, APPLICATION_SCOPE are not directly called by this LWC, but by its helper.
    };
  },
  { virtual: true }
);

// Mocking the uiRecordApi
jest.mock(
  "lightning/uiRecordApi",
  () => {
    return {
      getRecord: jest.fn(), // Default mock, can be overridden per test
    };
  },
  { virtual: true }
);

// Mocking the helper modules
jest.mock("./../helpers/conversationName.js");
jest.mock("./../helpers/integration.js");
jest.mock("./../helpers/messageChannels.js");

describe("c-agent-assist-container-module", () => {
  beforeEach(() => {
    // Default mock for getRecord, assuming it's for contact phone in voice channel
    getRecord.mockResolvedValue({
      fields: { Phone: { value: "1234567890" } },
    });
    // Mock default return values for helpers
    conversationNameHelper.getConversationName.mockResolvedValue("mockConversationName");
    conversationNameHelper.delConversationName.mockResolvedValue();
    integrationHelper.registerAuthToken.mockResolvedValue("mockToken");

    // Mock window functions that are called by the component
    global.window.addAgentAssistEventListener = jest.fn();
    global.window.dispatchAgentAssistEvent = jest.fn();
    // Mock for window._uiModuleEventTarget.cloneNode used in disconnectedCallback
    // Ensure it's an object with a cloneNode method.
    global.window._uiModuleEventTarget = { cloneNode: jest.fn().mockReturnThis() };
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
    // Restore all manually mocked global objects if necessary, or clear them
    // jest.restoreAllMocks() can be too broad if not careful with how mocks are set up.
  });

  async function flushPromises() {
    // eslint-disable-next-line no-undef
    return new Promise(resolve => setImmediate(resolve));
  }

  // Helper to create and append the component with given parameters
  const createComponent = (params = {}) => {
    const element = createElement("c-agent-assist-container-module", {
      is: AgentAssistContainerModule,
    });
    // Assign properties to the element based on params
    element.recordId = params.recordId || "testRecordId";
    element.endpoint = params.endpoint || "testEndpoint";
    element.features = params.features || "CONVERSATION_SUMMARIZATION,SMART_REPLY";
    element.conversationProfile =
      params.conversationProfile ||
      "projects/proj/locations/loc/conversationProfiles/convProfile";
    element.channel = params.channel || "chat"; // default to chat
    element.consumerKey = params.consumerKey || "testKey";
    element.consumerSecret = params.consumerSecret || "testSecret";
    if (params.debugMode) {
      element.debugMode = params.debugMode;
    }

    // Specific mock for getRecord if channel is voice for this instance
    if (element.channel === "voice") {
      getRecord.mockResolvedValue({ data : { fields: { Phone: { value: params.contactPhone || "1234567890" } } } });
    } else {
      // If not voice, ensure getRecord is not unexpectedly called or provide a generic mock.
      // For this setup, getRecord is wired, so it will be called.
      // If it's not for 'Contact.Phone', this mock might need adjustment.
      getRecord.mockResolvedValue({ data: { fields: {} }}); // Default for non-voice if no specific fields needed
    }


    document.body.appendChild(element);
    return element;
  };

  it("initializes and calls subscribeToMessageChannels", async () => {
    createComponent();
    await flushPromises(); // loadScript
    await flushPromises(); // registerAuthToken, getConversationName, etc.

    expect(integrationHelper.checkConfiguration).toHaveBeenCalled();
    expect(integrationHelper.registerAuthToken).toHaveBeenCalled();
    expect(messageChannelsHelper.subscribeToMessageChannels).toHaveBeenCalledWith(
      "testRecordId",
      false, // debugMode
      expect.stringMatching(/^(mockConversationName|projects\/proj\/locations\/loc\/conversations\/SF-testRecordId)$/), // conversationName
      "CONVERSATION_SUMMARIZATION,SMART_REPLY",
      "SF-testRecordId", // conversationId
      expect.anything() // messageContext (wired)
    );
  });

  it("calls window.addAgentAssistEventListener for all events during initAgentAssistEvents", async () => {
    createComponent();
    await flushPromises(); // loadScript
    await flushPromises(); // Other async ops in renderedCallback

    // initAgentAssistEvents is called in renderedCallback after scripts are loaded
    expect(global.window.addAgentAssistEventListener).toHaveBeenCalledTimes(5);
    expect(global.window.addAgentAssistEventListener).toHaveBeenCalledWith(
      "api-connector-initialized", expect.any(Function), { namespace: "testRecordId" }
    );
    expect(global.window.addAgentAssistEventListener).toHaveBeenCalledWith(
      "conversation-initialized", expect.any(Function), { namespace: "testRecordId" }
    );
    expect(global.window.addAgentAssistEventListener).toHaveBeenCalledWith(
      "smart-reply-selected", expect.any(Function), { namespace: "testRecordId" }
    );
    expect(global.window.addAgentAssistEventListener).toHaveBeenCalledWith(
      "agent-coaching-response-selected", expect.any(Function), { namespace: "testRecordId" }
    );
    expect(global.window.addAgentAssistEventListener).toHaveBeenCalledWith(
      "copy-to-clipboard", expect.any(Function), { namespace: "testRecordId" }
    );
  });

  it("calls window.dispatchAgentAssistEvent and delConversationName on 'conversation-completed' for voice channel", async () => {
    // Ensure getConversationName returns a consistent value for this test
    conversationNameHelper.getConversationName.mockResolvedValue("voiceConvName");
    const element = createComponent({ channel: "voice" });
    await flushPromises(); // loadScript
    await flushPromises(); // Other async ops

    // Find the 'conversation-completed' event listener and invoke it
    const convCompletedCall = global.window.addAgentAssistEventListener.mock.calls.find(
      call => call[0] === "conversation-completed"
    );
    expect(convCompletedCall).toBeDefined();
    const eventHandler = convCompletedCall[1];

    await eventHandler(); // Invoke the handler
    await flushPromises(); // For async operations within the handler (delConversationName)

    expect(global.window.dispatchAgentAssistEvent).toHaveBeenCalledWith(
      "conversation-summarization-requested",
      { detail: { conversationName: "voiceConvName" } },
      { namespace: "testRecordId" }
    );
    expect(conversationNameHelper.delConversationName).toHaveBeenCalledWith(
      "mockToken", "testEndpoint", "1234567890" // Default phone
    );
  });

  it("does NOT add 'conversation-completed' listener for chat channel", async () => {
    createComponent({ channel: "chat" });
    await flushPromises();
    await flushPromises();

    const convCompletedCall = global.window.addAgentAssistEventListener.mock.calls.find(
      call => call[0] === "conversation-completed"
    );
    expect(convCompletedCall).toBeUndefined();
  });

  it("calls unsubscribeToMessageChannels on disconnectedCallback for chat channel", async () => {
    const element = createComponent({ channel: "chat" });
    await flushPromises(); // Ensure connected/rendered logic runs

    document.body.removeChild(element); // Trigger disconnectedCallback
    await flushPromises();

    expect(messageChannelsHelper.unsubscribeToMessageChannels).toHaveBeenCalled();
  });

  it("does NOT call unsubscribeToMessageChannels on disconnectedCallback for voice channel", async () => {
    const element = createComponent({ channel: "voice" });
    await flushPromises();

    document.body.removeChild(element);
    await flushPromises();

    expect(messageChannelsHelper.unsubscribeToMessageChannels).not.toHaveBeenCalled();
  });

  it("sets loadError if registerAuthToken fails", async () => {
    integrationHelper.registerAuthToken.mockRejectedValueOnce(new Error("Auth Error"));
    const element = createComponent();
    await flushPromises(); // loadScript
    await flushPromises(); // registerAuthToken

    expect(element.loadError).toBeInstanceOf(Error);
    expect(element.loadError.message).toContain("Auth Error");
  });

  it("sets loadError if conversationProfile format is invalid", async () => {
    const element = createComponent({ conversationProfile: "invalid" });
    await flushPromises(); // loadScript
    await flushPromises(); // Logic in renderedCallback

    expect(element.loadError).toBeInstanceOf(Error);
    expect(element.loadError.message).toContain("is not a valid conversation profile");
  });

  it("polls for conversationName for voice channel if not immediately available", async () => {
    conversationNameHelper.getConversationName
      .mockResolvedValueOnce(null) // First call
      .mockResolvedValueOnce(null) // Second call (poll)
      .mockResolvedValueOnce("polledVoiceConvName"); // Third call (poll)

    jest.useFakeTimers();
    const element = createComponent({ channel: "voice", debugMode: true });
    await flushPromises(); // Initial renderedCallback

    expect(conversationNameHelper.getConversationName).toHaveBeenCalledTimes(1);

    // Fast-forward time to trigger polling
    jest.advanceTimersByTime(5000);
    await flushPromises(); // For async getConversationName
    expect(conversationNameHelper.getConversationName).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(5000);
    await flushPromises(); // For async getConversationName
    expect(conversationNameHelper.getConversationName).toHaveBeenCalledTimes(3);

    // Check that handleApiConnectorInitialized was called after polling succeeded
    expect(integrationHelper.handleApiConnectorInitialized).toHaveBeenCalledWith(
        null, true, "polledVoiceConvName", "testRecordId"
    );

    // Check that UI modules are initialized (simplified check by looking at class change)
    const containerContainerEl = element.shadowRoot.querySelector(".agent-assist-container");
    expect(containerContainerEl.classList.contains("hidden")).toBe(false);

    jest.useRealTimers();
  });
});
