// @ts-nocheck
import * as Flex from '@twilio/flex-ui';

import { AgentAssistEvent } from '../../types/feature-loader';

export const addHook = (flex: typeof Flex, manager: Flex.Manager, feature: string, hook: any) => {
  if (!hook.agentAssistEventName) {
    console.info(`Feature ${feature} declared agent assist event hook, but is missing agentAssistEventName to hook`);
    return;
  }
  const event = hook.agentAssistEventName as AgentAssistEvent;

  console.info(
    `Feature ${feature} registered %c${event} %cevent hook: %c${hook.agentAssistEventHook.name}`,
    'font-weight:bold',
    'font-weight:normal',
    'font-weight:bold',
  );

  addAgentAssistEventListener(event, function (eventPayload: any) {
    hook.agentAssistEventHook(flex, manager, eventPayload);
  });
};
