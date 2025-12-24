import React, { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useNavigate } from 'react-router-dom';
import { osrsApi, Item } from '@/services/osrs-api';
import { Calculator, Home, TrendingUp, Search } from 'lucide-react';

const CommandMenu = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (open && items.length === 0) {
        osrsApi.getMapping().then(data => {
            // Filter to relevant items to keep search fast? 
            // Fuse/CMDK handles large lists okay, but 4000 items might be heavy.
            // Let's just take tradeable ones or top 1000? 
            // For now, take all, it should be fine.
            setItems(data);
        });
    }
  }, [open, items.length]);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <div className="hidden">
        {/* Hidden trigger hint if needed, or just rely on docs */}
      </div>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search items..." />
        <CommandList className="bg-slate-950 text-slate-200 border-slate-800">
          <CommandEmpty>No results found.</CommandEmpty>
          
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
              <Home className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
              <TrendingUp className="mr-2 h-4 w-4" />
              <span>Market Opportunities</span>
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator className="bg-slate-800" />
          
          <CommandGroup heading="Items">
            {items.slice(0, 50).map((item) => (
                <CommandItem
                    key={item.id}
                    value={item.name}
                    onSelect={() => runCommand(() => navigate(`/item/${item.id}`))}
                >
                    <Search className="mr-2 h-4 w-4 opacity-50" />
                    <span>{item.name}</span>
                    <span className="ml-auto text-xs text-slate-500">ID: {item.id}</span>
                </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default CommandMenu;