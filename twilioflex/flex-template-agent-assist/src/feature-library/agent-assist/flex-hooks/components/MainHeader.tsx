import * as Flex from '@twilio/flex-ui';

import { isAgentAssistEnabled } from '../../utils/helpers';
import { FlexComponent } from '../../../../types/feature-loader';
import AgentAssistAlertButton from '../../custom-components/AgentAssistAlertButton';

export const componentName = FlexComponent.MainHeader;
export const componentHook = function addAgentAssistToMainHeader(flex: typeof Flex, manager: Flex.Manager) {
  if (!isAgentAssistEnabled()) {
    return;
  }

  // Add alert button to the main header
  flex.MainHeader.Content.add(<AgentAssistAlertButton key="template-agent-assist-main-header" />, {
    sortOrder: -1,
    align: 'end',
  });
};
