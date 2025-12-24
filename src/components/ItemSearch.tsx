import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Item } from "@/services/osrs-api";

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

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const lowerQuery = query.toLowerCase();
    // Simple filter - in a real app consider Fuse.js for fuzzy search
    const filtered = items
      .filter(item => item.name.toLowerCase().includes(lowerQuery))
      .slice(0, 10); // Limit to 10 results for performance
    
    setResults(filtered);
    setIsOpen(true);
  }, [query, items]);

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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
        <Input 
          type="text" 
          placeholder="Search items (e.g. 'Zulrah scale')..." 
          className="pl-10 bg-slate-900 border-slate-800 focus:border-emerald-500 text-slate-100 placeholder:text-slate-600 h-12 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setResults.length > 0 && setIsOpen(true)}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4 animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-lg shadow-xl z-50 overflow-hidden">
          {results.map((item) => (
            <button
              key={item.id}
              className="w-full text-left px-4 py-3 hover:bg-slate-800 transition-colors flex items-center justify-between group border-b border-slate-800 last:border-0"
              onClick={() => {
                onSelect(item);
                setQuery("");
                setIsOpen(false);
              }}
            >
              <span className="font-medium text-slate-200 group-hover:text-emerald-400">{item.name}</span>
              <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded">ID: {item.id}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemSearch;