import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { CommandPalette } from './ui/CommandPalette';

export function Layout() {
  return (
    <div className="flex flex-col h-screen bg-background text-primary overflow-hidden font-sans selection:bg-gold/20 selection:text-gold">
      <CommandPalette />
      <Navbar />

      <main className="flex-1 overflow-y-auto min-w-0 bg-background relative scroll-smooth">
        <div className="container mx-auto p-4 md:p-8 max-w-[1600px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
