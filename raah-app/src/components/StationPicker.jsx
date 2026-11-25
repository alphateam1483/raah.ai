import React, { useState, useRef, useEffect } from 'react';

export default function StationPicker({
  id,
  label,
  value,
  onChange,
  stations = {},
  error = null,
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Station display helper: e.g. "SASARAM (SSM)"
  const stationList = Object.entries(stations).map(([code, data]) => ({
    code,
    name: data.name,
    display: `${data.name} (${code})`,
  }));

  const selectedStation = stations[value];
  const selectedText = selectedStation
    ? `${selectedStation.name} (${value})`
    : value;

  // Filter stations: prefix first, then contains
  const filtered = stationList.filter((s) => {
    if (!query) return true;
    const q = query.trim().toUpperCase();
    return s.code.includes(q) || s.name.toUpperCase().includes(q);
  }).sort((a, b) => {
    if (!query) return a.name.localeCompare(b.name);
    const q = query.trim().toUpperCase();
    const aCodePrefix = a.code.startsWith(q);
    const bCodePrefix = b.code.startsWith(q);
    if (aCodePrefix && !bCodePrefix) return -1;
    if (!aCodePrefix && bCodePrefix) return 1;

    const aNamePrefix = a.name.startsWith(q);
    const bNamePrefix = b.name.startsWith(q);
    if (aNamePrefix && !bNamePrefix) return -1;
    if (!aNamePrefix && bNamePrefix) return 1;

    return a.name.localeCompare(b.name);
  });

  // Close combobox when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(code) {
    onChange(code);
    setIsOpen(false);
    setQuery('');
  }

  return (
    <div className="station-picker-container" ref={containerRef}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className={`combobox-wrapper ${error ? 'combobox-error' : ''}`}>
        <input
          id={id}
          ref={inputRef}
          type="text"
          className="combobox-input"
          value={isOpen ? query : selectedText}
          placeholder="Type station name or code"
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
          }}
          onChange={(e) => setQuery(e.target.value)}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          autoComplete="off"
        />
        <button
          type="button"
          className="combobox-arrow-btn"
          aria-label={`Toggle ${label} options`}
          tabIndex={-1}
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              inputRef.current?.focus();
            }
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {error && <div className="field-error-text" role="alert">{error}</div>}

      {isOpen && (
        <ul className="combobox-dropdown" role="listbox">
          {filtered.length === 0 ? (
            <li className="combobox-empty" role="option" aria-selected="false">
              No matching stations
            </li>
          ) : (
            filtered.map((s) => {
              const isSelected = s.code === value;
              return (
                <li
                  key={s.code}
                  role="option"
                  aria-selected={isSelected}
                  className={`combobox-option ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(s.code)}
                >
                  <span className="station-opt-name">{s.name}</span>
                  <span className="station-opt-code">({s.code})</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

