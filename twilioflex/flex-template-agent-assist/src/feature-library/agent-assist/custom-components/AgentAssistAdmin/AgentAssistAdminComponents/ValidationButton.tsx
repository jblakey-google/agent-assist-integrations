import { HelpText } from '@twilio-paste/core/help-text';
import { Button } from '@twilio-paste/core/button';
import { Stack } from '@twilio-paste/core/stack';

interface ConfigItem {
  configItem: string;
  hasError: boolean;
  statusMessage: string;
}

interface ValidationButtonProps {
  configItem: ConfigItem;
  testConnectionFunction: any;
  label: string;
  dataTestId: string;
}

export const ValidationButton = ({
  configItem,
  testConnectionFunction,
  label,
  dataTestId,
}: ValidationButtonProps): JSX.Element => {
  return (
    <Stack orientation="horizontal" spacing="space30">
      <Button
        variant="primary"
        onClick={(e) => testConnectionFunction()}
        disabled={configItem.configItem === '' || configItem.hasError}
        data-testid={dataTestId}
      >
        {label}
      </Button>
      {configItem.statusMessage !== '' && (
        <HelpText id="endpoint-help-text" variant={configItem.hasError ? 'error' : 'success'}>
          {configItem.statusMessage}
        </HelpText>
      )}
    </Stack>
  );
};
