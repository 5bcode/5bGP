import { NavLink, useNavigate } from 'react-router-dom';
import { FaMagnifyingGlass, FaCoins, FaPalette } from 'react-icons/fa6';
import { useState } from 'react';
import clsx from 'clsx';
import { usePreferencesStore } from '../store/preferencesStore';
import { toast } from 'sonner';

export function Navbar() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const { theme, setTheme } = usePreferencesStore();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (search.trim()) {
            navigate(`/screener?search=${encodeURIComponent(search)}`);
        }
    };

    const cycleTheme = () => {
        const themes: ('molten' | 'midnight' | 'runelite')[] = ['molten', 'midnight', 'runelite'];
        const currentIndex = themes.indexOf(theme);
        const nextTheme = themes[(currentIndex + 1) % themes.length];
        setTheme(nextTheme);
        toast.info(`Theme set to ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)}`);
    };

    const navLinks = [
        { to: "/", label: "Market highlights" },
        { to: "/screener", label: "Item screener" },
        { to: "/portfolio", label: "Portfolio" },
    ];

    return (
        <nav className="h-16 border-b border-border bg-sidebar flex items-center justify-between px-4 md:px-8 shrink-0">
            {/* Left: Logo & Links */}
            <div className="flex items-center gap-8">
                <NavLink to="/" className="flex items-center gap-2 text-gold font-bold text-lg hover:opacity-90 transition-opacity">
                    <FaCoins className="text-xl" />
                    <span className="hidden sm:block">Flip to 5B</span>
                </NavLink>

                <div className="hidden md:flex items-center gap-1">
                    {navLinks.map(link => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            className={({ isActive }) => clsx(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                                isActive ? "text-primary bg-zinc-800" : "text-secondary hover:text-primary hover:bg-zinc-800/50"
                            )}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </div>
            </div>

            {/* Right: Search & Actions */}
            <div className="flex items-center gap-4">
                <form onSubmit={handleSearch} className="relative hidden sm:block group">
                    <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-gold transition-colors text-xs" />
                    <input
                        type="text"
                        placeholder="Search items..."
                        className="bg-background border border-border rounded-full py-1.5 pl-9 pr-4 text-sm w-48 focus:w-64 transition-all focus:outline-none focus:border-gold placeholder:text-muted/50"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </form>

                <div className="h-6 w-px bg-border mx-2 hidden sm:block"></div>

                <button className="text-sm font-bold text-green hover:text-green-400 transition-colors flex items-center gap-2">
                    <span className="hidden sm:inline">Upgrade now</span>
                </button>

                <button
                    onClick={cycleTheme}
                    className="p-2 rounded-full bg-zinc-800 text-muted hover:text-primary transition-colors"
                    title={`Current theme: ${theme}`}
                >
                    <FaPalette className="text-sm" />
                </button>
            </div>
        </nav>
    );
}
