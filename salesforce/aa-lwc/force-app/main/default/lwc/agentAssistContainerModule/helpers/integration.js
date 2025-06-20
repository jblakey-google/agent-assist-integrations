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

export function checkConfiguration(
  endpoint,
  features,
  conversationProfile,
  consumerKey,
  consumerSecret,
  debugMode
) {
  const checks = [
    endpoint,
    features,
    conversationProfile,
    consumerKey,
    consumerSecret
  ];
  let isConfigSet = true;
  checks.forEach((check) => {
    if (check === null) {
      isConfigSet = false;
      console.error(
        `Agent Assist LWC config: "${check}" needs to be set in Lightning App Builder.`
      );
    }
  });
  if (debugMode && isConfigSet) {
    console.log(
      "Agent Assist LWC config: finished check with no missing values."
    );
  }
}

export async function registerAuthToken(consumerKey, consumerSecret, endpoint) {
  const access_token = await fetch(
    `/services/oauth2/token?` +
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: consumerKey,
        client_secret: consumerSecret
      })
  )
    .then((res) => {
      return res.json();
    })
    .then((data) => {
      return data.access_token;
    });

  return await fetch(endpoint + "/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`
    }
  })
    .then((res) => {
      return res.json();
    })
    .then((data) => data.token);
}

export function handleApiConnectorInitialized(
  event,
  debugMode,
  conversationName,
  recordId
) {
  if (debugMode) {
    console.log(event);
  }
  dispatchAgentAssistEvent(
    "active-conversation-selected",
    {
      detail: {
        conversationName: conversationName
      }
    },
    {
      namespace: recordId
    }
  );
}

function listMessagesResponseReceivedHandler(
  event,
  sfMsgs,
  debugMode,
  conversationId,
  recordId
) {
  const dfMsgs = event.detail.payload.messages || [];
  if (debugMode) {
    console.log(
      `reconcileConversationLogs: ${sfMsgs.length} sfMsgs, ${dfMsgs.length} dfMsgs`
    );
  }
  // Check there are new messages to reconcile
  const countOfSalesforceMessagesToAdd = sfMsgs.length - dfMsgs.length;
  if (countOfSalesforceMessagesToAdd < 1) return;
  const newMsgs = sfMsgs.slice(sfMsgs.length - countOfSalesforceMessagesToAdd);
  newMsgs.forEach((msg) => {
    dispatchAgentAssistEvent(
      "analyze-content-requested",
      {
        detail: {
          conversationId: conversationId,
          participantRole: msg.type === "END_USER" ? "END_USER" : "HUMAN_AGENT",
          request: { textInput: { text: msg.content } }
        }
      },
      {
        namespace: recordId
      }
    );
  });
}

export async function reconcileConversationLogs(
  unusedEvent,
  lwcToolKitApi,
  recordId,
  debugMode,
  conversationId,
  conversationName
) {
  // Get Salesforce messages
  const toolKit = lwcToolKitApi;
  const sfConvLog = await toolKit.getConversationLog(recordId);
  const sfMsgs = sfConvLog && sfConvLog.messages ? sfConvLog.messages : [];
  if (sfMsgs.length === 0) return;

  // Rsponse handler for DF messages request
  addAgentAssistEventListener(
    "list-messages-response-received",
    (event) =>
      listMessagesResponseReceivedHandler(
        event,
        sfMsgs,
        debugMode,
        conversationId,
        recordId
      ),
    {
      namespace: recordId
    }
  );

  // Request DF messages
  dispatchAgentAssistEvent(
    "list-messages-requested",
    { detail: { conversationName: conversationName } },
    {
      namespace: recordId
    }
  );
}

export async function handleSmartReplySelected(event, lwcToolKitApi, recordId) {
  const toolKit = lwcToolKitApi;
  await toolKit.setAgentInput(recordId, {
    text: event.detail.answer.reply
  });
}

export async function handleAgentCoachingResponseSelected(
  event,
  lwcToolKitApi,
  recordId
) {
  const toolKit = lwcToolKitApi;
  await toolKit.setAgentInput(recordId, {
    text: event.detail.selectedResponse
  });
}

export async function handleCopyToClipboard(event, debugMode) {
  if (debugMode) {
    console.log("copied:", event.detail.textToCopy);
  }
  navigator.clipboard.writeText(event.detail.textToCopy);
}

export function initEventDragnet(recordId) {
  const eventNames = [
    "active-conversation-selected",
    "copy-to-clipboard",
    "smart-reply-selected",
    "smart-reply-follow-up-suggestions-received",
    "conversation-details-received",
    "conversation-initialization-requested",
    "conversation-initialized",
    "conversation-started",
    "conversation-completed",
    "conversation-profile-requested",
    "conversation-profile-received",
    "conversation-model-requested",
    "conversation-model-received",
    "get-generators-requested",
    "get-generators-received",
    "new-message-received",
    "analyze-content-requested",
    "analyze-content-response-received",
    "conversation-summarization-requested",
    "stateless-suggestion-requested",
    "stateless-suggestion-response-received",
    "stateless-conversation-summarization-requested",
    "stateless-conversation-summarization-response-received",
    "conversation-summarization-received",
    "dialogflow-api-error",
    "dialogflow-api-authentication-error",
    "answer-record-requested",
    "answer-record-received",
    "patch-answer-record-requested",
    "patch-answer-record-received",
    "article-search-requested",
    "article-search-response-received",
    "dark-mode-toggled",
    "snackbar-notification-requested",
    "live-person-connector-initialized",
    "genesys-cloud-connector-initialized",
    "genesys-engage-wwe-connector-initialized",
    "api-connector-initialized",
    "event-based-connector-initialized",
    "live-person-connector-initialization-failed",
    "genesys-cloud-connector-initialization-failed",
    "genesys-engage-wwe-connector-initialization-failed",
    "genesys-cloud-connector-access-token-received",
    "api-connector-initialization-failed",
    "event-based-connector-initialization-failed",
    "event-based-connection-established",
    "list-messages-requested",
    "list-messages-response-received",
    "virtual-agent-assist-response-message-selected",
    "human-agent-transfer-initiated",
    "search-knowledge-requested",
    "search-knowledge-response-received",
    "knowledge-assist-v2-answer-pasted",
    "agent-coaching-response-selected",
    "batch-create-messages-requested",
    "batch-create-messages-response-received",
    "agent-translation-generator-missing",
    "agent-translation-received"
  ];
  console.log("initEventDragnet - listening for:", eventNames);
  eventNames.forEach((eventName) => {
    addAgentAssistEventListener(
      eventName,
      (event) => console.log("initEventDragnet - heard:", event),
      {
        namespace: recordId
      }
    );
  });
}

export default {
  checkConfiguration,
  registerAuthToken,
  handleApiConnectorInitialized,
  reconcileConversationLogs,
  handleCopyToClipboard,
  handleSmartReplySelected,
  handleAgentCoachingResponseSelected,
  initEventDragnet
};
