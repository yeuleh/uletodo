import Button from '../ui/Button';

interface HeaderProps {
  onAddTask?: () => void;
}

export default function Header({ onAddTask }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:px-8 min-h-[73px]">
        {/* Left side - empty for now, could add breadcrumbs or page title later */}
        <div className="flex items-center">
          {/* Page title or breadcrumbs could go here */}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-3">
          {/* Search bar - hidden on small screens */}
          <div className="hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="搜索任务..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
              />
            </div>
          </div>

          {/* Add task button */}
          <Button size="sm" className="whitespace-nowrap" onClick={onAddTask}>
            <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">添加任务</span>
            <span className="sm:hidden">添加</span>
          </Button>
        </div>
      </div>
    </header>
  );
}