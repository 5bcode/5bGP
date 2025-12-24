import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Item } from "@/services/osrs-api";
import Fuse from 'fuse.js';

interface ItemSearchProps {
  items: Item[];
  onSelect: (item: Item) => void;
  isLoading?: boolean;
}

const ItemSearch = ({ items, onSelect, isLoading }: ItemSearchProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Initialize Fuse instance
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: ['name'],
      threshold: 0.3, // 0.0 = perfect match, 1.0 = match anything
      distance: 100,
      minMatchCharLength: 2,
    });
  }, [items]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    // Perform fuzzy search
    const fuseResults = fuse.search(query);
    const filtered = fuseResults.map(result => result.item).slice(0, 10);
    
    setResults(filtered);
    setIsOpen(true);
  }, [query, fuse]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  return (
    <div className="relative w-full max-w-xl mx-auto mb-8" ref={wrapperRef}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5 group-focus-within:text-emerald-500 transition-colors" />
        <Input 
          type="text" 
          placeholder="Search items (e.g. 'tbow', 'fury')..." 
          className="pl-10 bg-slate-900 border-slate-800 focus:border-emerald-500 text-slate-100 placeholder:text-slate-600 h-14 text-lg shadow-lg shadow-black/20"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setResults.length > 0 && setIsOpen(true)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 h-5 w-5 animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {results.map((item) => (
            <button
              key={item.id}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors flex items-center justify-between group border-b border-slate-800/50 last:border-0"
              onClick={() => {
                onSelect(item);
                setQuery("");
                setIsOpen(false);
              }}
            >
              <span className="font-medium text-slate-200 group-hover:text-emerald-400">{item.name}</span>
              <div className="flex items-center gap-2">
                 {item.limit && (
                     <span className="text-[10px] uppercase text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        Limit: {item.limit}
                     </span>
                 )}
                 <span className="text-xs text-slate-600">#{item.id}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemSearch;