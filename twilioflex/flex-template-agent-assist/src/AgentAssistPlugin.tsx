import * as Flex from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';
import loadjs from 'loadjs';

import { getScriptSources } from './feature-library/agent-assist/config';
import { initFeatures, initAgentAssistFeatures } from './utils/feature-loader';

const PLUGIN_NAME = 'AgentAssist';

export default class AgentAssist extends FlexPlugin {
  // eslint-disable-next-line no-restricted-syntax
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof Flex }
   * @param manager { Flex.Manager }
   */
  init(flex: typeof Flex, manager: Flex.Manager) {
    const scriptSources = Object.values(getScriptSources());
    loadjs(scriptSources, 'agent-assist');
    loadjs.ready('agent-assist', function () {
      initAgentAssistFeatures(flex, manager);
    });
    initFeatures(flex, manager);
  }
}
