import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders uletodo title', () => {
    render(<App />);
    expect(screen.getByText('uletodo')).toBeInTheDocument();
  });

  it('renders initialization message', () => {
    render(<App />);
    expect(
      screen.getByText('待办事项管理应用 - 项目初始化完成')
    ).toBeInTheDocument();
  });
});
