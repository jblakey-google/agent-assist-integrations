export interface Transcription {
  enabled: boolean;
  version: {
    live_transcription: boolean;
    intermediate_transcription: boolean;
  };
}

type env_options = 'prod';

interface AgentAssistScripts {
  common: string;
  container: string;
  summarization: string;
  knowledge_assist: string;
  transcript: string;
  agent_coaching: string;
  smart_reply: string;
  live_translation: string;
}

export default interface AgentAssistConfig {
  enabled: boolean;
  custom_api_endpoint: string;
  conversation_profile: string;
  conversation_summary: boolean;
  agent_coaching: boolean;
  knowledge_assist: boolean;
  smart_reply: boolean;
  enable_voice: boolean;
  notifier_server_endpoint: string;
  transcription: Transcription;
  script_sources: {
    staging: AgentAssistScripts;
    prod: AgentAssistScripts;
  };
  ui_module_version: env_options;
  debug: boolean;
}
