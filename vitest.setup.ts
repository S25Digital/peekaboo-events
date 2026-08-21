import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Ensures each test starts with a clean DOM, preventing leakage
// between renderHook/render calls across test files.
afterEach(() => {
  cleanup();
});
