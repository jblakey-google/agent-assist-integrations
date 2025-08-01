import * as Flex from '@twilio/flex-ui';

import { FlexActionEvent, FlexAction } from '../../../../types/feature-loader';

export const actionEvent = FlexActionEvent.after;
export const actionName = 'ResumeChannel';
export const actionHook = function afterResumeChannel(flex: typeof Flex, _manager: Flex.Manager) {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload, abortFunction) => {
    console.log('resuming conversation');
  });
};
