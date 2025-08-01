import fetch from 'jest-fetch-mock';
import { resetServiceConfiguration } from './test-utils/flex-service-configuration';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Global test lifecycle handlers
beforeAll(() => {
  fetch.enableMocks();
});

beforeEach(() => {
  fetch.resetMocks();
})

afterEach(() => {
  resetServiceConfiguration();
});
