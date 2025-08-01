import { configureAxe } from 'jest-axe';

const axe = configureAxe({
  impactLevels: ['critical'],
  globalOptions: {
    rules: [
      {
        id: 'min-test',
        tags: ['wcag21a', 'wcag21aa', 'best-practice'],
      },
    ],
  },
});

export default axe;
