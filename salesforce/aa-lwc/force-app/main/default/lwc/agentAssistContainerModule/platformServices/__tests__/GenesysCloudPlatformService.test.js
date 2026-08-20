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

  afterEach(() => {
    jest.useRealTimers();
  });

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
      genesysCloudPlatformService.genesysConversationId = "test-genesys-id";
      global.fetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ conversationName: "test-conversation-name" })
      });

      await genesysCloudPlatformService.init();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://test-endpoint.com/conversation-name?conversationIntegrationKey=test-genesys-id",
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
      genesysCloudPlatformService.genesysConversationId = "test-genesys-id";
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ conversationName: null })
      });

      const spy = jest.spyOn(
        genesysCloudPlatformService,
        "pollForConversationNameByIntegrationKey"
      );

      await genesysCloudPlatformService.init();

      expect(spy).toHaveBeenCalledWith("test-genesys-id");
    });

    it("aborts early if isTeardown is true", async () => {
      genesysCloudPlatformService.isTeardown = true;
      const fetchSpy = jest.spyOn(genesysCloudPlatformService, "fetchConversationName");

      await genesysCloudPlatformService.init();

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("waitForGenesysConversationId", () => {
    it("resolves when genesysConversationId becomes available", async () => {
      jest.useFakeTimers();
      genesysCloudPlatformService.genesysConversationId = null;
      let resolved = false;

      const promise = genesysCloudPlatformService.waitForGenesysConversationId().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      jest.advanceTimersByTime(500);
      expect(resolved).toBe(false);

      // Set genesys ID
      genesysCloudPlatformService.genesysConversationId = "abcd-1234";

      jest.advanceTimersByTime(500);
      await promise;

      expect(resolved).toBe(true);
    });

    it("resolves when isTeardown is true", async () => {
      jest.useFakeTimers();
      genesysCloudPlatformService.genesysConversationId = null;
      let resolved = false;

      const promise = genesysCloudPlatformService.waitForGenesysConversationId().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      genesysCloudPlatformService.isTeardown = true;

      jest.advanceTimersByTime(500);
      await promise;

      expect(resolved).toBe(true);
    });
  });

  describe("handleGenesysMessage", () => {
    it("sets genesysConversationId and starts polling on interactionSubscription", () => {
      const spy = jest.spyOn(
        genesysCloudPlatformService,
        "pollForConversationNameByIntegrationKey"
      );
      
      const event = {
        data: {
          type: "interactionSubscription",
          data: {
            interaction: {
              id: "new-convo-id"
            }
          }
        }
      };

      genesysCloudPlatformService.handleGenesysMessage(event);

      expect(genesysCloudPlatformService.genesysConversationId).toBe("new-convo-id");
      expect(spy).toHaveBeenCalledWith("new-convo-id");
    });
    
    it("clears old polling timeout and starts new polling if already polling", () => {
      const spy = jest.spyOn(
        genesysCloudPlatformService,
        "pollForConversationNameByIntegrationKey"
      );
      
      const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");
      genesysCloudPlatformService.pollingTimeout = "existing-timeout";
      
      const event = {
        data: JSON.stringify({
          type: "PureCloud.Interaction",
          data: {
            id: "another-convo-id"
          }
        })
      };

      genesysCloudPlatformService.handleGenesysMessage(event);

      expect(genesysCloudPlatformService.genesysConversationId).toBe("another-convo-id");
      expect(clearTimeoutSpy).toHaveBeenCalledWith("existing-timeout");
      expect(spy).toHaveBeenCalledWith("another-convo-id");
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
      mockLwc.conversationName = "test-conversation-name";
      mockLwc.features = "";

      genesysCloudPlatformService.handleConversationEndedForGenesysCloud();

      expect(mockLwc.triggerSummarization).not.toHaveBeenCalled();
    });

    it("starts polling for conversation name after handling conversation ended", () => {
      mockLwc.conversationName = "test-conversation-name";
      genesysCloudPlatformService.genesysConversationId = "test-genesys-id";

      const spy = jest.spyOn(
        genesysCloudPlatformService,
        "pollForConversationNameByIntegrationKey"
      );

      genesysCloudPlatformService.handleConversationEndedForGenesysCloud();

      expect(spy).toHaveBeenCalledWith("test-genesys-id");
    });
  });
});
