export const scvEventNames = [ "callstarted", "callconnected", "callended", "hold", "resume", "mute", "unmute", "participantadded", "participantremoved", "conference", "swap", "pauserecording", "resumerecording", "transcript", "wrapupended", "flagraise", "flaglower" ]

export function subscribeToVoiceToolkit(toolkitApi, telephonyEventListener) {
  for (const eventName of scvEventNames) {
    toolkitApi.addEventListener(eventName, telephonyEventListener);
    // console.log('subscribing to', eventName);
  }
}

export function unsubscribeFromVoiceToolkit(toolkitApi, telephonyEventListener) {
  for (const eventName of scvEventNames) {
    toolkitApi.addEventListener(eventName, telephonyEventListener);
    // console.log('unsubscribing from', eventName);
  }
}