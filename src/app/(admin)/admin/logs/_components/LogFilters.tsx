"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { AdminLogType } from "@prisma/client";

export default function LogFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [type, setType] = useState(searchParams.get("type") || "");

  // Debounce search update
  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.set("page", "1"); // Reset to page 1 on filter change
      return params.toString();
    },
    [searchParams]
  );

  const handleSearch = () => {
    router.push(`?${createQueryString("search", search)}`);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    router.push(`?${createQueryString("type", newType)}`);
  };

  const clearFilters = () => {
    setSearch("");
    setType("");
    router.push("?");
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-[var(--glass-panel)] border border-[var(--glass-border)] rounded-xl">
      {/* Search Input */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
        <input
          type="text"
          placeholder="Search logs (Admin, Target, Details)..."
          className="w-full bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      {/* Type Filter */}
      <div className="relative min-w-[200px]">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
        <select
          className="w-full bg-white dark:bg-black/20 border border-slate-300 dark:border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white appearance-none focus:outline-none focus:border-[var(--accent-primary)] transition-colors cursor-pointer"
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          <option value="">All Event Types</option>
          {Object.values(AdminLogType).map((t) => (
            <option key={t} value={t}>
              {t.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-pink-500 text-white rounded-lg text-sm font-bold transition-colors"
        >
          Search
        </button>
        {(search || type) && (
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-[var(--text-muted)] hover:text-slate-900 dark:hover:text-white rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
