import { screen } from '@testing-library/react';

import { AgentAssistAdminVoiceSettings } from './AgentAssistAdminVoiceSettings';
import axe from '../../../../../../test-utils/axe-helper';
import { StringTemplates as AgentAssistStringTemplates } from '../../../flex-hooks/strings/AgentAssist';
import { renderWithProviders } from '../../../../../../test-utils/test-utils';

describe('AgentAssistAdminVoiceSettings', () => {
  describe('When the form is empty', () => {
    it('should display place holder text for the notifier server endpoint input box', async () => {
      const placeholderText = 'Enter notifier server endpoint';

      renderWithProviders(<AgentAssistAdminVoiceSettings />);

      const input = await screen.findByPlaceholderText(placeholderText);

      expect(input).toBeDefined();
    });

    it('should have enable audio off by default', async () => {
      renderWithProviders(<AgentAssistAdminVoiceSettings />);

      const enableVoiceSwitch = await screen.findByTestId(`enable-voice-switch`);

      expect(enableVoiceSwitch).toHaveProperty('checked', false);
    });

    it('should have enable transcription off by default', async () => {
      renderWithProviders(<AgentAssistAdminVoiceSettings />);

      const enableTranscriptionSwitch = await screen.findByTestId(
        `enable-${AgentAssistStringTemplates.Transcription}-switch`,
      );

      expect(enableTranscriptionSwitch).toHaveProperty('checked', false);
    });
  });

  it('should pass accessibility test', async () => {
    const { container } = renderWithProviders(<AgentAssistAdminVoiceSettings />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
