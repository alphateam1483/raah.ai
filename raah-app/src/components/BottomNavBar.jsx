import React from 'react';

/**
 * BottomNavBar — Mobile-first sticky bottom navigation bar.
 * Provides quick navigation between Search, Results, Saved / Route, and About / Info modal.
 */
export default function BottomNavBar({
  activeTab = 'search',
  onTabChange,
  hasResults = false,
  savedCount = 0
}) {
  return (
    <nav className="bottom-nav-bar" aria-label="Bottom Navigation">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'search' ? 'active' : ''}`}
        onClick={() => onTabChange('search')}
        aria-label="Search"
      >
        <svg
          className="bottom-nav-icon"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="bottom-nav-label">Search</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'results' ? 'active' : ''}`}
        onClick={() => onTabChange('results')}
        disabled={!hasResults}
        aria-label="Results"
      >
        <svg
          className="bottom-nav-icon"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span className="bottom-nav-label">Results</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'timeline' ? 'active' : ''}`}
        onClick={() => onTabChange('timeline')}
        disabled={!hasResults}
        aria-label="Route Journey"
      >
        <svg
          className="bottom-nav-icon"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="6" cy="19" r="3" />
          <path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H7" />
          <circle cx="6" cy="5" r="3" />
          <path d="M6 8v8" />
        </svg>
        <span className="bottom-nav-label">Journey</span>
      </button>

      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'info' ? 'active' : ''}`}
        onClick={() => onTabChange('info')}
        aria-label="Corridor Info"
      >
        <svg
          className="bottom-nav-icon"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span className="bottom-nav-label">Info</span>
      </button>
    </nav>
  );
}
