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

export async function getConversationName(token, endpoint, contactPhone, debugMode) {
  /**
   * Gets conversationName from Redis using conversationIntegrationKey.
   * For voice channel, presence of this key in Redis triggers UI Module initialization.
   *
   * @param {string} token - The authentication token.
   * @param {string} endpoint - The API endpoint.
   * @param {string} contactPhone - The contact phone number.
   * @returns {Promise<string | null>} The conversation name or null if not found.
   */
  const getOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${token}`
    }
  };
  let conversationName = await fetch(
    endpoint + "/conversation-name?conversationIntegrationKey=" + contactPhone,
    getOptions
  )
    .then((res) => res.json())
    .then((data) => data.conversationName)
    .catch((err) => {
      if (err.status === 404) {
        return null;
      }
      console.error(err);
    });

  if (!conversationName) return null;

  return await fetch(endpoint + "/v2/" + conversationName, getOptions)
    .then((res) => res.json())
    .then((conversation) => {
      console.log("conversation lifecycle state:", conversation.lifecycleState);
      if (conversation.lifecycleState !== "COMPLETED") {
        return conversation.name;
      }
      if (debugMode) {
        console.log(
          `Conversation ${conversation.name} is COMPLETED, and its key is` +
          ' being deleted from Redis. To prevent this for debugging purposes,' +
          ' return conversation.name from this if block.'
        );
      }
      delConversationName(token, endpoint, contactPhone);
    })
    .catch((err) => console.error(err));
}

export async function delConversationName(token, endpoint, contactPhone) {
  /**
   * Deletes conversationIntegrationKey:conversationName pair from Redis.
   * For voice channel, deleting this key allows the UI Modules to start polling for a new conversation.
   *
   * @param {string} token - The authentication token.
   * @param {string} endpoint - The API endpoint.
   * @param {string} contactPhone - The contact phone number.
   * @returns {Promise<void>}
   */
  return await fetch(
    endpoint + "/conversation-name?conversationIntegrationKey=" + contactPhone,
    {
      method: "DELETE",
      headers: { Authorization: `${token}` }
    }
  )
    .then((res) => {
      if (res.ok) {
        console.log(`deleted Redis key for ${contactPhone}.`);
      } else {
        throw new Error(res.status);
      }
    })
    .catch((err) => console.error(err));
}

export default {
  getConversationName,
  delConversationName
};
