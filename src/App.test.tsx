import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock Tauri API for testing
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

describe('App', () => {
  it('renders uletodo title', () => {
    render(<App />);
    expect(screen.getByText('uletodo')).toBeInTheDocument();
  });

  it('renders add task button', () => {
    render(<App />);
    expect(screen.getByText('添加任务')).toBeInTheDocument();
  });

  it('renders task list header', () => {
    render(<App />);
    expect(screen.getByText('任务列表')).toBeInTheDocument();
  });
});
