/// <reference types="vitest" />
/// <reference types="@testing-library/jest-dom" />

import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

// Vitest type augmentation pour intégrer les matchers @testing-library/jest-dom.
// Les interfaces vides sont volontaires : elles servent uniquement à étendre
// le type via `extends`, sans ajouter de membre. C'est le pattern officiel
// recommandé par Vitest et Testing Library.
declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends TestingLibraryMatchers<T, void> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends TestingLibraryMatchers<unknown, void> {}
}

