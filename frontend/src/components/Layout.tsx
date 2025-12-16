import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { FaBars } from 'react-icons/fa6';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-primary overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden relative">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-border flex items-center justify-between bg-sidebar">
          <span className="font-bold text-gold">Flip to 5B</span>
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-secondary hover:text-primary"
          >
            <FaBars size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
