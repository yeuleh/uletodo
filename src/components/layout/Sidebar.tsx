interface SidebarProps {
  isExpanded: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isExpanded, onToggle }: SidebarProps) {
  const navigationItems = [
    { name: '收件箱', icon: 'inbox', count: 12, active: true },
    { name: '今天', icon: 'calendar', count: 5, active: false },
    { name: '即将到期', icon: 'clock', count: 3, active: false },
    { name: '已完成', icon: 'check', count: 8, active: false },
  ];

  const projects = [
    { name: '工作项目', color: 'bg-blue-500', count: 6 },
    { name: '个人事务', color: 'bg-green-500', count: 4 },
    { name: '学习计划', color: 'bg-purple-500', count: 2 },
  ];

  const getIcon = (iconName: string) => {
    const icons = {
      inbox: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0H4m16 0l-2-2m2 2l-2 2M4 13l2-2m-2 2l2 2" />
        </svg>
      ),
      calendar: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      clock: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      check: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    };
    return icons[iconName as keyof typeof icons] || icons.inbox;
  };

  return (
    <div className={`
      bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out
      ${isExpanded ? 'w-64' : 'w-16'}
    `}>
      {/* Sidebar header with user info and toggle button */}
      <div className="flex items-center justify-between px-4 py-4">
        {isExpanded ? (
          <>
            {/* User info */}
            <div className="flex items-center min-w-0">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">U</span>
                </div>
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">用户</p>
                <p className="text-xs text-gray-500">个人版</p>
              </div>
            </div>
            
            {/* Toggle button */}
            <button
              type="button"
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              onClick={onToggle}
              title="收缩侧边栏"
            >
              <span className="sr-only">收缩侧边栏</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </>
        ) : (
          /* Collapsed state - only user avatar and toggle button */
          <div className="flex flex-col items-center space-y-2 w-full">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-white">U</span>
            </div>
            <button
              type="button"
              className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              onClick={onToggle}
              title="展开侧边栏"
            >
              <span className="sr-only">展开侧边栏</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 space-y-8 overflow-y-auto">
        {/* Main navigation */}
        <div className={isExpanded ? 'px-4' : 'px-2'}>
          <ul className="space-y-1">
            {navigationItems.map((item) => (
              <li key={item.name}>
                <a
                  href="#"
                  className={`
                    group flex items-center rounded-md transition-colors relative
                    ${isExpanded ? 'px-3 py-2 text-sm' : 'p-3 justify-center'}
                    ${item.active 
                      ? 'bg-primary-100 text-primary-700' 
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  title={!isExpanded ? item.name : undefined}
                >
                  {/* Icon */}
                  <span className={`
                    ${item.active ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'}
                    ${isExpanded ? 'mr-3' : ''}
                  `}>
                    {getIcon(item.icon)}
                  </span>
                  
                  {/* Text and count - only show when expanded */}
                  {isExpanded && (
                    <>
                      <span className="flex-1 font-medium">{item.name}</span>
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${item.active 
                          ? 'bg-primary-200 text-primary-800' 
                          : 'bg-gray-200 text-gray-600 group-hover:bg-gray-300'
                        }
                      `}>
                        {item.count}
                      </span>
                    </>
                  )}
                  
                  {/* Count badge for collapsed state */}
                  {!isExpanded && item.count > 0 && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary-600 text-white min-w-[1.25rem] h-5">
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Projects section - only show when expanded */}
        {isExpanded && (
          <div className="px-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                项目
              </h3>
              <button className="p-1 rounded text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <ul className="space-y-1">
              {projects.map((project) => (
                <li key={project.name}>
                  <a
                    href="#"
                    className="group flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <div className="flex items-center min-w-0">
                      <span className={`w-3 h-3 rounded-full mr-3 flex-shrink-0 ${project.color}`} />
                      <span className="truncate">{project.name}</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 group-hover:bg-gray-300 ml-2">
                      {project.count}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Collapsed projects - show only colored dots */}
        {!isExpanded && (
          <div className="px-2">
            <div className="space-y-2">
              {projects.map((project) => (
                <div key={project.name} className="flex justify-center">
                  <button
                    className={`w-3 h-3 rounded-full ${project.color} hover:scale-110 transition-transform`}
                    title={project.name}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>


    </div>
  );
}