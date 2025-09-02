import * as Flex from '@twilio/flex-ui';

import { FlexActionEvent } from '../../../../types/feature-loader';
import { StringTemplates } from '../strings/AgentAssist';
import { AgentAssistContainer } from '../../custom-components/AgentAssistContainer/AgentAssistContainer';

export const actionEvent = FlexActionEvent.before;
export const actionName = 'LoadCRMContainerTabs';
export const actionHook = function addAgentAssistContainerToEnhancedCRM(flex: typeof Flex, manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload) => {
    if (!payload.task || Flex.TaskHelper.isInWrapupMode(payload.task)) {
      return;
    }

    payload.components = [
      ...payload.components,
      {
        title: (manager.strings as any)[StringTemplates.AgentAssist],
        order: 0,
        component: <AgentAssistContainer />,
      },
    ];
  });
};
