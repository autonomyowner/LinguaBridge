import React, { useState } from "react";
import { SUPPORTED_LANGUAGES } from "../../types";

interface UserSearchBarProps {
  onSearch: (query: string, languageFilter?: string) => void;
  placeholder?: string;
}

const UserSearchBar: React.FC<UserSearchBarProps> = ({
  onSearch,
  placeholder = "Search by name or email...",
}) => {
  const [query, setQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("");

  const handleSearch = () => {
    onSearch(query, languageFilter || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search Input */}
      <div className="flex-1 relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{ color: "var(--text-muted)" }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="matcha-input pl-10 w-full"
        />
      </div>

      {/* Language Filter */}
      <div className="flex gap-2">
        <select
          value={languageFilter}
          onChange={(e) => setLanguageFilter(e.target.value)}
          className="matcha-select"
          style={{ minWidth: "140px" }}
        >
          <option value="">All languages</option>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleSearch}
          className="matcha-btn matcha-btn-primary px-6"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default UserSearchBar;
