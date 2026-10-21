import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar.js';
import { TopBar } from './topbar.js';

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — fixed height, scrollable nav */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main
          className="flex-1 overflow-y-auto scrollbar-thin"
          id="main-content"
          tabIndex={-1}
        >
          <div className="mx-auto max-w-7xl p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
