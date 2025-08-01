import React, { useEffect, useState } from 'react';
import { FormControl, FormSection, FormSectionHeading } from '@twilio-paste/core/form';
import { Switch } from '@twilio-paste/core/switch';
import { Separator } from '@twilio-paste/core/separator';
import { templates } from '@twilio/flex-ui';
import { useDispatch, useSelector } from 'react-redux';

import { StringTemplates as AgentAssistStringTemplates } from '../../flex-hooks/strings/AgentAssist';
import { AgentAssistAdminVoiceSettings } from './AgentAssistAdminVoiceSettings';
import { AgentAssistAdminFeatureSettings } from './AgentAssistAdminFeatureSettings';
import { AgentAssistAdminGeneralSettings } from './AgentAssistAdminGeneralSettings';
import { AppState } from '../../../../types/manager';
import { reduxNamespace } from '../../../../utils/state';
import { AgentAssistAdminState, updateAgentAssistAdminState } from '../../flex-hooks/states/AgentAssistAdmin';

interface OwnProps {
  feature: string;
  initialConfig: any;
  setModifiedConfig: (featureName: string, newConfig: any) => void;
  setAllowSave: (featureName: string, allowSave: boolean) => void;
}

export const AgentAssistAdmin = (props: OwnProps) => {
  const dispatch = useDispatch();
  const agentAssistAdminState = useSelector(
    (state: AppState) => state[reduxNamespace].agentAssistAdmin as AgentAssistAdminState,
  );

  const setAllowSave = (allowSave: boolean) => {
    props.setAllowSave(props.feature, allowSave);
  };

  useEffect(() => {
    dispatch(updateAgentAssistAdminState({ ...props.initialConfig }));
  }, []);

  useEffect(() => {
    const { hasError, ...rest } = agentAssistAdminState;
    setAllowSave(!hasError);
    props.setModifiedConfig(props.feature, {
      ...rest,
    });
  }, [agentAssistAdminState]);

  return (
    <>
      <AgentAssistAdminGeneralSettings />
      <Separator orientation="horizontal" />
      <AgentAssistAdminFeatureSettings />
      <Separator orientation="horizontal" />
      <AgentAssistAdminVoiceSettings />
      <Separator orientation="horizontal" />
      <FormSection>
        <FormSectionHeading>Troubleshooting</FormSectionHeading>
        <FormControl key={'debug-control'}>
          <Switch
            checked={agentAssistAdminState.debug}
            onChange={(e) => dispatch(updateAgentAssistAdminState({ debug: e.target.checked }))}
          >
            {templates[AgentAssistStringTemplates.Debug]()}
          </Switch>
        </FormControl>
      </FormSection>
    </>
  );
};
