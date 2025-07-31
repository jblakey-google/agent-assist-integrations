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
  -default-libs -GetNextEvent -QueuesPolling -login-image -********* -SF-BYOT -SDK -UI-Components -startAgentQueues -cancellation -allow-scripts  -apple-mobile-web -ComponentProfiler -empApi -lastError -aria-hidden -ERR_BLOCKED_BY_CLIENT -enable-canvas -lightning-spinner -lightning-button -CXoneScreenPop -voiceConnector -presencesync -CXoneClient -login: -InstrumentationResult -startPolling -"text":"startTimeout -uBOL:
```
