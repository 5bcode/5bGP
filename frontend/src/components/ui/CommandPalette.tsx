import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { useMarketData } from "../../hooks/useMarketData";
import { FaCoins, FaWallet, FaList, FaArrowRight } from "react-icons/fa6";

export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();
    const { items } = useMarketData();

    // Toggle with Ctrl+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = (command: () => void) => {
        setOpen(false);
        command();
    };

    return (
        <Command.Dialog
            open={open}
            onOpenChange={setOpen}
            label="Global Command Menu"
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh] animate-in fade-in"
        >
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <Command.Input
                    placeholder="Search for items or pages..."
                    className="w-full bg-transparent border-b border-border px-4 py-4 text-primary placeholder:text-muted focus:outline-none"
                />

                <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
                    <Command.Empty className="py-6 text-center text-sm text-muted">
                        No results found.
                    </Command.Empty>

                    <Command.Group heading="Pages" className="text-xs text-muted font-bold uppercase tracking-wider mb-2 px-2">
                        <Command.Item
                            onSelect={() => runCommand(() => navigate("/"))}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary hover:bg-hover hover:text-primary cursor-pointer aria-selected:bg-hover aria-selected:text-primary transition-colors"
                        >
                            <FaCoins className="text-gold" /> Highlights
                        </Command.Item>
                        <Command.Item // Using Screener icon
                            onSelect={() => runCommand(() => navigate("/screener"))}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary hover:bg-hover hover:text-primary cursor-pointer aria-selected:bg-hover aria-selected:text-primary transition-colors"
                        >
                            <FaList className="text-purple-400" /> Screener
                        </Command.Item>
                        <Command.Item
                            onSelect={() => runCommand(() => navigate("/portfolio"))}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary hover:bg-hover hover:text-primary cursor-pointer aria-selected:bg-hover aria-selected:text-primary transition-colors"
                        >
                            <FaWallet className="text-green-500" /> Portfolio
                        </Command.Item>
                    </Command.Group>

                    <div className="h-px bg-border my-2 mx-2"></div>

                    <Command.Group heading="Items" className="text-xs text-muted font-bold uppercase tracking-wider mb-2 px-2">
                        {items.slice(0, 100).map((item) => (
                            <Command.Item
                                key={item.id}
                                value={`${item.name} ${item.id}`} // Searchable text
                                onSelect={() => runCommand(() => navigate(`/item/${item.id}`))}
                                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-secondary hover:bg-hover hover:text-primary cursor-pointer aria-selected:bg-hover aria-selected:text-primary transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    {item.icon && (
                                        <img
                                            src={`https://oldschool.runescape.wiki/images/${item.icon.replace(/ /g, '_')}`}
                                            className="w-5 h-5 object-contain opacity-70 group-aria-selected:opacity-100"
                                            alt=""
                                        />
                                    )}
                                    <span>{item.name}</span>
                                </div>
                                <FaArrowRight className="opacity-0 -translate-x-2 group-aria-selected:opacity-100 group-aria-selected:translate-x-0 transition-all text-xs text-gold" />
                            </Command.Item>
                        ))}
                        {items.length > 100 && (
                            <div className="px-3 py-2 text-xs text-muted italic">
                                search to see more items...
                            </div>
                        )}
                    </Command.Group>
                </Command.List>

                <div className="bg-zinc-900/50 border-t border-border px-4 py-2 flex items-center justify-between text-[10px] text-muted">
                    <div className="flex gap-2">
                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded border border-border">↑↓</span> to navigate
                        <span className="bg-zinc-800 px-1.5 py-0.5 rounded border border-border">↵</span> to select
                    </div>
                    <span>Global Search</span>
                </div>
            </div>
        </Command.Dialog>
    );
}
