export interface ConnectorConfig {
  /** Communication mode for the UI modules application. */
  channel: string;
  /** Agent desktop to use. */
  agentDesktop: string;
  /** Conversation profile name to use. */
  conversationProfileName: string;
  /** API Connector config. */
  apiConfig: {
    /**
     * Authentication token to attach to outgoing requests. Should be a valid
     * OAuth token for Dialogflow API, or any other token for custom API
     * endpoints.
     */
    authToken: string;
    /**
     * Specifies a custom proxy server to call instead of calling the Dialogflow
     * API directly.
     */
    customApiEndpoint?: string;
    /** API key to use. */
    apiKey?: string;
    /**
     * Additional HTTP headers to include in the Dialogflow/proxy server API
     * request.
     */
    headers?: string[];
  };
  /** Event-based connector config. Set this for voice conversations. */
  eventBasedConfig?: {
    /**
     * Transport protocol to use for updates. Defaults to 'websocket' if none is
     * specified.
     */
    transport?: string;
    /** Event-based library to use (i.e., Socket.io). */
    library?: string;
    /** Endpoint to which the connection will be established. */
    notifierServerEndpoint: string;
  };
}

export interface UiModuleConnector {
  init(config?: ConnectorConfig): void | Promise<void>;
  disconnect(): void;
  setAuthToken(authToken: string): void;
  initSubscription?(): void;
}

/** Service interface for event-based connectors. */
export interface UiModuleEventBasedConnector extends UiModuleConnector {
  subscribeToConversation(conversationId: string): void;
  unsubscribeFromConversation(conversationId: string): void;
}
