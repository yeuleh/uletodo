import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from './Sidebar';

describe('Sidebar', () => {
  it('renders expanded sidebar with text and counts', () => {
    render(<Sidebar isExpanded={true} />);
    
    // Should show user info
    expect(screen.getByText('用户')).toBeInTheDocument();
    expect(screen.getByText('个人版')).toBeInTheDocument();
    
    // Should show navigation text
    expect(screen.getByText('收件箱')).toBeInTheDocument();
    expect(screen.getByText('今天')).toBeInTheDocument();
    expect(screen.getByText('即将到期')).toBeInTheDocument();
    expect(screen.getByText('已完成')).toBeInTheDocument();
    
    // Should show project section
    expect(screen.getByText('项目')).toBeInTheDocument();
    expect(screen.getByText('工作项目')).toBeInTheDocument();
    expect(screen.getByText('个人事务')).toBeInTheDocument();
    expect(screen.getByText('学习计划')).toBeInTheDocument();
  });

  it('renders collapsed sidebar with only icons', () => {
    render(<Sidebar isExpanded={false} />);
    
    // Should still show user avatar but not text
    expect(screen.getByText('U')).toBeInTheDocument();
    
    // Should not show navigation text
    expect(screen.queryByText('收件箱')).not.toBeInTheDocument();
    expect(screen.queryByText('今天')).not.toBeInTheDocument();
    
    // Should not show project section text
    expect(screen.queryByText('项目')).not.toBeInTheDocument();
    expect(screen.queryByText('工作项目')).not.toBeInTheDocument();
    
    // Should not show user text in collapsed state
    expect(screen.queryByText('用户')).not.toBeInTheDocument();
    expect(screen.queryByText('个人版')).not.toBeInTheDocument();
  });

  it('calls onToggle when toggle button is clicked', () => {
    const handleToggle = vi.fn();
    render(<Sidebar isExpanded={true} onToggle={handleToggle} />);
    
    const toggleButton = screen.getByRole('button', { name: /收缩侧边栏/i });
    fireEvent.click(toggleButton);
    
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('shows correct toggle button tooltip for collapsed state', () => {
    render(<Sidebar isExpanded={false} />);
    
    const toggleButton = screen.getByRole('button', { name: /展开侧边栏/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('applies correct width classes', () => {
    const { rerender, container } = render(<Sidebar isExpanded={true} />);
    
    // Expanded state should have w-64 class
    expect(container.firstChild).toHaveClass('w-64');
    
    rerender(<Sidebar isExpanded={false} />);
    
    // Collapsed state should have w-16 class
    expect(container.firstChild).toHaveClass('w-16');
  });
});