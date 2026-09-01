import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { searchPlaces } from '../utils/geocoding';
import { toPersianDigits } from '../utils/persian';
import type { SearchResult } from '../types';

interface SearchBarProps {
  onSelect: (lat: number, lng: number) => void;
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchPlaces(value, 6);
        setResults(res);
        setOpen(res.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, []);

  const handleSelect = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onSelect(lat, lng);
    setQuery(result.display_name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="absolute top-4 right-4 z-[1000] w-[380px] max-w-[calc(100vw-2rem)]">
      <div className="relative">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            {loading ? (
              <Loader2 size={20} className="text-blue-500 animate-spin shrink-0" />
            ) : (
              <Search size={20} className="text-gray-400 shrink-0" />
            )}
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => results.length > 0 && setOpen(true)}
              placeholder="جستجوی مکان... (مثال: میدان آزادی تهران)"
              className="w-full text-sm outline-none placeholder:text-gray-400 bg-transparent font-[Vazirmatn]"
              dir="rtl"
            />
          </div>

          {/* Results dropdown */}
          {open && results.length > 0 && (
            <div className="border-t border-gray-100 max-h-[300px] overflow-y-auto sidebar-scroll">
              {results.map((r) => (
                <button
                  key={r.place_id}
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-right hover:bg-gray-50 transition-colors search-result-item border-b border-gray-50 last:border-0"
                >
                  <MapPin size={16} className="text-blue-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate leading-relaxed">
                      {r.display_name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {toPersianDigits(parseFloat(r.lat).toFixed(4))}, {toPersianDigits(parseFloat(r.lon).toFixed(4))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
