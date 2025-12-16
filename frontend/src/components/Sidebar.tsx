import { NavLink } from 'react-router-dom';
import { FaCoins, FaTableCellsLarge, FaWallet, FaChartLine, FaList } from 'react-icons/fa6';
import clsx from 'clsx';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navItems = [
    { to: "/", icon: <FaTableCellsLarge />, label: "Dashboard" },
    { to: "/portfolio", icon: <FaWallet />, label: "Portfolio" },
    { to: "/highlights", icon: <FaChartLine />, label: "Highlights" },
    { to: "/screener", icon: <FaList />, label: "Screener" },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside className={clsx(
        "fixed md:static inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-border p-5 transition-transform duration-300 transform md:transform-none flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center gap-3 text-gold text-xl font-bold mb-10">
          <FaCoins /> <span>Flip to 5B</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                isActive 
                  ? "bg-[#1f1d16] text-gold border-l-4 border-gold" 
                  : "text-secondary hover:bg-hover hover:text-primary"
              )}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="text-xs text-muted mt-auto pt-6 border-t border-border">
          <p>Status: <span className="text-green">Live</span></p>
          <p>Last Updated: {new Date().toLocaleTimeString()}</p>
        </div>
      </aside>
    </>
  );
}
