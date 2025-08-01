import { render, screen } from '@testing-library/react';

import axe from '../../../../../test-utils/axe-helper';
import { renderWithProviders } from '../../../../../test-utils/test-utils';
import { AgentAssistAlertButton } from './AgentAssistAlertButton';

describe('AgentAssistAdminFeatureSettings', () => {
  it('should pass accessibility test', async () => {
    const { container } = renderWithProviders(<AgentAssistAlertButton />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
