import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock Tauri API for testing
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn().mockResolvedValue([]),
}));

describe('App', () => {
  it('renders user info in sidebar', () => {
    render(<App />);
    expect(screen.getByText('用户')).toBeInTheDocument();
    expect(screen.getByText('个人版')).toBeInTheDocument();
  });

  it('renders add task buttons', () => {
    render(<App />);
    const addTaskButtons = screen.getAllByText('添加任务');
    expect(addTaskButtons.length).toBeGreaterThan(0);
  });

  it('renders task list header', () => {
    render(<App />);
    const inboxHeaders = screen.getAllByText('收件箱');
    expect(inboxHeaders.length).toBeGreaterThan(0);
  });
});
