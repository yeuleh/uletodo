

import { TaskManager } from './pages';
import { ErrorBoundary, NotificationSystem } from './components/common';
import { OfflineIndicator } from './hooks/useOfflineSupport';
import "./App.css";

function App() {
  return (
    <ErrorBoundary>
      <div className="app">
        <OfflineIndicator className="app__offline-indicator" />
        <TaskManager />
        <NotificationSystem position="top-right" maxNotifications={5} />
      </div>
    </ErrorBoundary>
  );
}

export default App;
