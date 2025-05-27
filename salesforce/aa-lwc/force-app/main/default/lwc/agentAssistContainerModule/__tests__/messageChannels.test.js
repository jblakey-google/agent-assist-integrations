import {
  subscribe as mockSubscribe,
  unsubscribe as mockUnsubscribe,
  APPLICATION_SCOPE as mockApplicationScope,
} from 'lightning/messageService';
import * as messageChannels from '../helpers/messageChannels';

// Mock the message channels themselves
jest.mock('@salesforce/messageChannel/lightning__conversationAgentSend__c', () => ({
  __esModule: true,
  default: 'mockedAgentSendChannel',
}));
jest.mock('@salesforce/messageChannel/lightning__conversationEndUserMessage__c', () => ({
  __esModule: true,
  default: 'mockedEndUserMessageChannel',
}));
jest.mock('@salesforce/messageChannel/lightning__conversationEnded__c', () => ({
  __esModule: true,
  default: 'mockedConversationEndedChannel',
}));

// Mock the dispatchAgentAssistEvent function (assuming it's global or needs a specific mock)
global.dispatchAgentAssistEvent = jest.fn();

describe('messageChannels', () => {
  const mockMessageContext = 'mocked-message-context';
  const mockRecordId = 'mocked-record-id';
  const mockConversationId = 'mocked-conversation-id';
  const mockConversationName = 'mocked-conversation-name';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Mock subscribe to return a unique subscription object for each call for testing unsubscribe
    let subId = 0;
    mockSubscribe.mockImplementation(() => ({ id: `mock-sub-${subId++}` }));
  });

  describe('subscribeToMessageChannels', () => {
    it('should subscribe to all relevant channels with correct parameters', () => {
      messageChannels.subscribeToMessageChannels(
        mockRecordId,
        false, // debugMode
        mockConversationName,
        '', // features
        mockConversationId,
        mockMessageContext
      );

      expect(mockSubscribe).toHaveBeenCalledTimes(3);
      expect(mockSubscribe).toHaveBeenCalledWith(
        mockMessageContext,
        'mockedAgentSendChannel', // Using the mocked channel name
        expect.any(Function),
        { scope: mockApplicationScope }
      );
      expect(mockSubscribe).toHaveBeenCalledWith(
        mockMessageContext,
        'mockedEndUserMessageChannel', // Using the mocked channel name
        expect.any(Function),
        { scope: mockApplicationScope }
      );
      expect(mockSubscribe).toHaveBeenCalledWith(
        mockMessageContext,
        'mockedConversationEndedChannel', // Using the mocked channel name
        expect.any(Function),
        { scope: mockApplicationScope }
      );
    });

    it('should not subscribe if messageContext is not available', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      messageChannels.subscribeToMessageChannels(
        mockRecordId,
        false,
        mockConversationName,
        '',
        mockConversationId,
        null // No message context
      );
      expect(mockSubscribe).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('MessageContext is not available.');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('unsubscribeToMessageChannels', () => {
    it('should unsubscribe from all stored subscriptions and clear them', () => {
      // First, subscribe to create stored subscriptions
      messageChannels.subscribeToMessageChannels(
        mockRecordId,
        false,
        mockConversationName,
        '',
        mockConversationId,
        mockMessageContext
      );

      // Capture the subscription objects that would have been stored
      // This is a bit indirect; ideally, we'd access the internal 'subscriptions' object,
      // but since it's not exported, we rely on the mockSubscribe behavior.
      const expectedSub1 = { id: 'mock-sub-0' }; // Based on mockImplementation
      const expectedSub2 = { id: 'mock-sub-1' };
      const expectedSub3 = { id: 'mock-sub-2' };

      messageChannels.unsubscribeToMessageChannels();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
      expect(mockUnsubscribe).toHaveBeenCalledWith(expectedSub1);
      expect(mockUnsubscribe).toHaveBeenCalledWith(expectedSub2);
      expect(mockUnsubscribe).toHaveBeenCalledWith(expectedSub3);

      // Try unsubscribing again to ensure subscriptions are cleared
      mockUnsubscribe.mockClear();
      messageChannels.unsubscribeToMessageChannels();
      expect(mockUnsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('handleMessageSend (via channel subscription)', () => {
    it('should call dispatchAgentAssistEvent with correct parameters for HUMAN_AGENT', () => {
      messageChannels.subscribeToMessageChannels(
        mockRecordId,
        false,
        mockConversationName,
        '',
        mockConversationId,
        mockMessageContext
      );

      const agentMessageHandler = mockSubscribe.mock.calls.find(call => call[1] === 'mockedAgentSendChannel')[2];
      const mockMessage = { recordId: mockRecordId, content: 'Hello from agent' };
      agentMessageHandler(mockMessage);

      expect(global.dispatchAgentAssistEvent).toHaveBeenCalledTimes(1);
      expect(global.dispatchAgentAssistEvent).toHaveBeenCalledWith(
        'analyze-content-requested',
        {
          detail: {
            conversationId: mockConversationId,
            participantRole: 'HUMAN_AGENT',
            request: {
              textInput: {
                text: 'Hello from agent',
                languageCode: "us",
              },
            },
          },
        },
        { namespace: mockRecordId }
      );
    });

    it('should call dispatchAgentAssistEvent with correct parameters for END_USER', () => {
      messageChannels.subscribeToMessageChannels(
        mockRecordId,
        false,
        mockConversationName,
        '',
        mockConversationId,
        mockMessageContext
      );

      const endUserMessageHandler = mockSubscribe.mock.calls.find(call => call[1] === 'mockedEndUserMessageChannel')[2];
      const mockMessage = { recordId: mockRecordId, content: 'Hola from user' };
      endUserMessageHandler(mockMessage);

      expect(global.dispatchAgentAssistEvent).toHaveBeenCalledTimes(1);
      expect(global.dispatchAgentAssistEvent).toHaveBeenCalledWith(
        'analyze-content-requested',
        {
          detail: {
            conversationId: mockConversationId,
            participantRole: 'END_USER',
            request: {
              textInput: {
                text: 'Hola from user',
                languageCode: "us",
              },
            },
          },
        },
        { namespace: mockRecordId }
      );
    });

    it('should not call dispatchAgentAssistEvent if recordId does not match', () => {
      messageChannels.subscribeToMessageChannels(
        mockRecordId,
        false,
        mockConversationName,
        '',
        mockConversationId,
        mockMessageContext
      );

      const agentMessageHandler = mockSubscribe.mock.calls.find(call => call[1] === 'mockedAgentSendChannel')[2];
      const mockMessage = { recordId: 'another-record-id', content: 'Hello' };
      agentMessageHandler(mockMessage);

      expect(global.dispatchAgentAssistEvent).not.toHaveBeenCalled();
    });
  });

  describe('handleConversationEnded (via channel subscription)', () => {
    it('should call dispatchAgentAssistEvent if CONVERSATION_SUMMARIZATION feature is present', () => {
      messageChannels.subscribeToMessageChannels(
        mockRecordId,
        false,
        mockConversationName,
        'CONVERSATION_SUMMARIZATION,OTHER_FEATURE', // Features
        mockConversationId,
        mockMessageContext
      );

      const conversationEndedHandler = mockSubscribe.mock.calls.find(call => call[1] === 'mockedConversationEndedChannel')[2];
      const mockMessage = { recordId: mockRecordId };
      conversationEndedHandler(mockMessage);

      expect(global.dispatchAgentAssistEvent).toHaveBeenCalledTimes(1);
      expect(global.dispatchAgentAssistEvent).toHaveBeenCalledWith(
        'conversation-summarization-requested',
        { detail: { conversationName: mockConversationName } },
        { namespace: mockRecordId }
      );
    });

    it('should not call dispatchAgentAssistEvent if CONVERSATION_SUMMARIZATION feature is NOT present', () => {
      messageChannels.subscribeToMessageChannels(
        mockRecordId,
        false,
        mockConversationName,
        'OTHER_FEATURE,ANOTHER_FEATURE', // Features
        mockConversationId,
        mockMessageContext
      );

      const conversationEndedHandler = mockSubscribe.mock.calls.find(call => call[1] === 'mockedConversationEndedChannel')[2];
      const mockMessage = { recordId: mockRecordId };
      conversationEndedHandler(mockMessage);

      expect(global.dispatchAgentAssistEvent).not.toHaveBeenCalled();
    });

    it('should not call dispatchAgentAssistEvent if recordId does not match', () => {
        messageChannels.subscribeToMessageChannels(
            mockRecordId,
            false,
            mockConversationName,
            'CONVERSATION_SUMMARIZATION',
            mockConversationId,
            mockMessageContext
        );

        const conversationEndedHandler = mockSubscribe.mock.calls.find(call => call[1] === 'mockedConversationEndedChannel')[2];
        const mockMessage = { recordId: 'another-record-id' };
        conversationEndedHandler(mockMessage);

        expect(global.dispatchAgentAssistEvent).not.toHaveBeenCalled();
    });
  });
});
