import { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface MainLayoutProps {
  children: ReactNode;
  sidebarExpanded?: boolean;
  onSidebarToggle?: () => void;
}

export default function MainLayout({ 
  children, 
  sidebarExpanded = true, 
  onSidebarToggle
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - always visible, changes width */}
      <Sidebar isExpanded={sidebarExpanded} onToggle={onSidebarToggle} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}