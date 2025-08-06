# dev notes

```sh
# Check what will be deployed
sf project deploy preview \
  --target-org jblakey347@agentforce.com \
  --ignore-conflicts \
  --metadata LightningComponentBundle:agentAssistContainerDev

# Actually deploy it
sf project deploy start \
  --target-org jblakey347@agentforce.com \
  --ignore-conflicts \
  --metadata LightningComponentBundle:agentAssistContainerDev

# DevTools filter list for clean console
```sh
# Turn of Warnings level, too
-ltng -O11y -******* -voiceConnector -preload -AdminService -CXOne -IRIS -incontact -Intervention -empAPI -showHasNotificationIndicator


-url:https://orgfarm-66cf7e67a8-dev-ed--nice-cxone.develop.vf.force.com/resource/1753217324000/nice_cxone__cxone_connector/styles.js -url:https://orgfarm-66cf7e67a8-dev-ed--nice-cxone.develop.vf.force.com/jslibrary/1647410351256/sfdc/NetworkTracking.js -url:https://orgfarm-66cf7e67a8-dev-ed--nice-cxone.develop.vf.force.com/assets/login-image.png -url:https://orgfarm-66cf7e67a8-dev-ed.develop.lightning.force.com/visualEditor/appBuilder.app?&retUrl=https%3A%2F%2Forgfarm-66cf7e67a8-dev-ed.develop.lightning.force.com%2Flightning%2Fr%2FMessagingSession%2F0MwgK000002eGpnSAE%2Fview%3Fchannel%3DOMNI&id=0M0gK000001tgNpSAI -url:https://orgfarm-66cf7e67a8-dev-ed.develop.lightning.force.com/libraries/instrumentation/beaconLib.BeaconLibrary.js -url:https://orgfarm-66cf7e67a8-dev-ed--nice-cxone.develop.vf.force.com/resource/1753217324000/nice_cxone__cxone_connector/default-libs_common_core-sdk_src_lib_http_index_ts-libs_common_core-sdk_src_logger_appenders_-033bd8.js -ltng -O11y -******* -voiceConnector -preload -AdminService -CXOne -IRIS -incontact -Intervention -empAPI -showHasNotificationIndicator -incontac -ShadowRoot
```

```sh
https://ui-connector-0001-226047614920.us-central1.run.app
CONVERSATION_SUMMARIZATION
projects/g184812-ccai-sandbox-pso/locations/global/conversationProfiles/Kpb59b_8TtWo0cAc_lZXWg
chat
messaging
3MVG9rZjd7MXFdLiK4Vudaaxp49EqjY0_4iJRsLNLiAQrc0kOQGZBUteu6E1NIvvoCa737KRy.FNR_XKVabPm
718995E1FE87118D8E3E11862EE651E520E2B6EFD7A9A0EEACCD5B2C3485D963
```

```sh
# Smart reply sample prompts
Can you find me an expensive place to stay that is located in the east?
I'm looking for an expensive restaurant that serves Thai food, please.
Hi, I need a hotel that includes free wifi in the north of Cambridge.
```

TODO: Need to document the new platform property in the Chat and Voice public docs
