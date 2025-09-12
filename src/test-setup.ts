import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri API
const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke
}));

// Make mockInvoke available globally for tests
(global as any).mockInvoke = mockInvoke;