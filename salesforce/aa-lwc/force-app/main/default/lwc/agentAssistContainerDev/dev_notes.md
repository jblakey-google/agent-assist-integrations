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
