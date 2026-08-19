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

import GenesysCloudPlatformService from "../GenesysCloudPlatformService";
import {
  setupPlatformServiceTest,
  createMockLwcComponent,
  createMockRefs
} from "../testUtils";

describe("GenesysCloudPlatformService", () => {
  let mockLwc;
  let mockRefs;
  let genesysCloudPlatformService;

  setupPlatformServiceTest();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create mock LWC component
    mockLwc = createMockLwcComponent({ platform: "genesyscloud" });

    // Create mock refs
    mockRefs = createMockRefs();

    // Create instance of GenesysCloudPlatformService
    genesysCloudPlatformService = new GenesysCloudPlatformService(
      mockLwc,
      mockRefs
    );
  });

  afterEach(() => {});

  describe("constructor", () => {
    it("initializes with lwc and refs parameters", () => {
      expect(genesysCloudPlatformService.lwc).toBe(mockLwc);
      expect(genesysCloudPlatformService.refs).toBe(mockRefs);
      expect(
        genesysCloudPlatformService.handleConversationEndedForGenesysCloud
      ).toBeDefined();
    });
  });

  describe("init", () => {
    it("executes without errors", () => {
      expect(() => {
        genesysCloudPlatformService.init();
      }).not.toThrow();
    });

    it("logs initGenesysCloud call", () => {
      genesysCloudPlatformService.init();
      expect(mockLwc.debugLog).toHaveBeenCalledWith("initGenesysCloud called");
    });

    it("fetches conversation name when conversationName is not set", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ conversationName: "test-conversation-name" })
      });

      await genesysCloudPlatformService.init();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-endpoint.com/conversation-name?conversationIntegrationKey=test-contact-phone",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "test-token"
          },
          signal: expect.any(AbortSignal)
        }
      );
    });

    it("polls for conversation name when conversationName is not set and not completed", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ conversationName: null })
      });

      const spy = jest.spyOn(
        genesysCloudPlatformService,
        "pollForConversationNameByIntegrationKey"
      );

      await genesysCloudPlatformService.init();

      expect(spy).toHaveBeenCalled();
    });
  });

  describe("teardown", () => {
    it("executes without errors", () => {
      expect(() => {
        genesysCloudPlatformService.teardown();
      }).not.toThrow();
    });

    it("clears polling timeout", () => {
      genesysCloudPlatformService.pollingTimeout = "some-timeout";
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

      genesysCloudPlatformService.teardown();

      expect(clearTimeoutSpy).toHaveBeenCalledWith("some-timeout");
    });
  });

  describe("listenToAgentAssistEventsForGenesysCloud", () => {
    it("adds event listener for conversation-completed", () => {
      genesysCloudPlatformService.listenToAgentAssistEventsForGenesysCloud();

      expect(global.addAgentAssistEventListener).toHaveBeenCalledWith(
        "conversation-completed",
        expect.any(Function),
        { namespace: "test-record-id" }
      );
    });
  });

  describe("fetchConversationName", () => {
    it("fetches conversation name successfully", async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ conversationName: "test-conversation-name" })
      });

      const result =
        await genesysCloudPlatformService.fetchConversationName("test-key");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-endpoint.com/conversation-name?conversationIntegrationKey=test-key",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "test-token"
          },
          signal: expect.any(AbortSignal)
        }
      );
      expect(result).toBe("test-conversation-name");
    });

    it("returns null when conversation name not found (404)", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 404
      });

      const result =
        await genesysCloudPlatformService.fetchConversationName("test-key");

      expect(result).toBeNull();
    });

    it("returns null when fetch fails with non-404 error", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error"
      });

      const result =
        await genesysCloudPlatformService.fetchConversationName("test-key");

      expect(result).toBeNull();
      expect(mockLwc.debugLog).toHaveBeenCalledWith(
        "Error fetching conversation name: 500 Internal Server Error"
      );
    });

    it("returns null when network error occurs", async () => {
      global.fetch.mockRejectedValue(new Error("Network error"));

      const result =
        await genesysCloudPlatformService.fetchConversationName("test-key");

      expect(result).toBeNull();
      expect(mockLwc.debugLog).toHaveBeenCalledWith(
        "Network error fetching conversation name: Network error"
      );
    });
  });

  describe("handleConversationEndedForGenesysCloud", () => {
    it("triggers summarization when the feature is enabled", () => {
      mockLwc.conversationName = "test-conversation-name";
      mockLwc.features = "CONVERSATION_SUMMARIZATION";

      genesysCloudPlatformService.handleConversationEndedForGenesysCloud();

      expect(mockLwc.triggerSummarization).toHaveBeenCalled();
    });

    it("does not trigger summarization when the feature is disabled", () => {
      mockLwc.features = ""; // Ensure the feature is not present
      genesysCloudPlatformService.handleConversationEndedForGenesysCloud();
      expect(mockLwc.triggerSummarization).not.toHaveBeenCalled();
    });

    it("starts polling for conversation name after handling conversation ended", () => {
      mockLwc.conversationName = "test-conversation-name";

      const spy = jest.spyOn(
        genesysCloudPlatformService,
        "pollForConversationNameByIntegrationKey"
      );

      genesysCloudPlatformService.handleConversationEndedForGenesysCloud();

      expect(spy).toHaveBeenCalledWith("test-contact-phone");
    });
  });
});
