import * as Flex from '@twilio/flex-ui';

import { AgentAssistTranscript } from '../../custom-components/AgentAssistTranscript/AgentAssistTranscript';
import { FlexComponent } from '../../../../types/feature-loader';
import { StringTemplates } from '../strings/AgentAssist';

export const componentName = FlexComponent.TaskCanvasTabs;
export const componentHook = function addTranscriptionTab(flex: typeof Flex, manager: Flex.Manager) {
  flex.TaskCanvasTabs.Content.add(
    <Flex.Tab
      key="transcription"
      uniqueName="transcription"
      label={(manager.strings as any)[StringTemplates.Transcription]}
    >
      <AgentAssistTranscript key="transcription-tab-content" />
    </Flex.Tab>,
    {
      sortOrder: 1000,
      if: ({ task }) => Flex.TaskHelper.isCallTask(task),
    },
  );
};
