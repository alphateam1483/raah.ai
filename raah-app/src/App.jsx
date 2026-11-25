import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import Header from './components/Header';
import SearchForm from './components/SearchForm';
import ResultsScreen from './components/ResultsScreen';
import LoadingSkeleton from './components/LoadingSkeleton';
import BottomNavBar from './components/BottomNavBar';
import { buildStationIndex, search, applySeats } from './lib/search';
import { initMockSeats } from './lib/mockSeats';

export default function App() {
  // splashDone controls whether the splash is showing
  const [splashDone, setSplashDone] = useState(false);

  const [corridorData, setCorridorData] = useState(null);
  const [stationIndex, setStationIndex] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [query, setQuery] = useState(null);
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [mobileView, setMobileView] = useState('search');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Load corridor.json once on mount (runs in background while splash shows)
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setDataLoading(true);
    setDataError(null);
    try {
      const response = await fetch('/data/corridor.json');
      if (!response.ok) {
        throw new Error(`Failed to load corridor data (HTTP ${response.status})`);
      }
      const data = await response.json();
      setCorridorData(data);
      const index = buildStationIndex(data);
      setStationIndex(index);
      initMockSeats(data);
    } catch (err) {
      console.error(err);
      setDataError('Could not load the timetable. Retry.');
    } finally {
      setDataLoading(false);
    }
  }

  function handleSearch(searchQuery) {
    if (!corridorData || !stationIndex) return;
    setIsSearching(true);
    setQuery(searchQuery);
    setTimeout(() => {
      try {
        const rawResults = search(searchQuery, corridorData, stationIndex, {
          minGapMin: searchQuery.minGapMin,
          maxWaitMin: searchQuery.maxWaitMin,
          earliestMin: searchQuery.earliestMin,
          classCode: searchQuery.classCode,
        });
        const withSeats = applySeats(rawResults, {
          includeRAC: searchQuery.includeRAC,
          classCode: searchQuery.classCode,
        });
        setResults(withSeats);
        setMobileView('results');
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);
  }

  function handleHomeClick() {
    setResults(null);
    setQuery(null);
    setMobileView('search');
  }

  function handleNavTabChange(tab) {
    if (tab === 'search') {
      setMobileView('search');
    } else if (tab === 'results' || tab === 'timeline') {
      if (results) {
        setMobileView('results');
        if (tab === 'timeline') {
          // Scroll smoothly to top where RoutePanel is anchored
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } else if (tab === 'info') {
      setShowInfoModal(true);
    }
  }

  return (
    <div className="raah-app-root">

      {/* ── SPLASH SCREEN ──
          Renders on top (z-index 99999, position:fixed).
          The app below loads in the background, hidden by opacity until splash finishes. */}
      {!splashDone && (
        <SplashScreen onComplete={() => setSplashDone(true)} />
      )}

      {/* ── MAIN APP ──
          Use opacity so the layout doesn't collapse. Data still loads behind the splash. */}
      <div className={splashDone ? 'app-ready' : 'app-hidden'}>
        <Header
          onHomeClick={handleHomeClick}
          showTagline={!results && !isSearching}
        />

        <main className="app-main-content">
          {dataLoading && <LoadingSkeleton />}

          {dataError && (
            <div className="error-card" role="alert">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                strokeLinejoin="round" className="error-icon" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="error-text">{dataError}</p>
              <button type="button" className="primary-button retry-btn" onClick={loadData}>
                Retry
              </button>
            </div>
          )}

          {!dataLoading && !dataError && corridorData && (
            <div className="layout-container">
              <div className={`search-form-section ${results && mobileView === 'results' ? 'hidden-on-mobile' : ''}`}>
                <SearchForm
                  stations={corridorData.stations}
                  initialValues={query || {}}
                  onSearch={handleSearch}
                  isSearching={isSearching}
                />
              </div>

              {isSearching && (
                <div className="results-loading-wrapper">
                  <LoadingSkeleton />
                </div>
              )}

              {!isSearching && results && query && (
                <div className={`results-section ${mobileView === 'search' ? 'hidden-on-mobile' : ''}`}>
                  <ResultsScreen
                    query={query}
                    results={results}
                    stations={corridorData.stations}
                    corridorData={corridorData}
                    stationIndex={stationIndex}
                    onEditSearch={() => setMobileView('search')}
                  />
                </div>
              )}
            </div>
          )}
        </main>

        {/* ── BOTTOM NAVIGATION BAR ── */}
        <BottomNavBar
          activeTab={mobileView === 'results' ? 'results' : 'search'}
          onTabChange={handleNavTabChange}
          hasResults={Boolean(results)}
        />

        {/* ── INFO MODAL ── */}
        {showInfoModal && (
          <div
            className="info-modal-backdrop"
            onClick={() => setShowInfoModal(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-modal-title"
          >
            <div
              className="info-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="info-modal-title" className="info-modal-title">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--lilac)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                About Raah.ai
              </h3>
              <div className="info-modal-body">
                <p>
                  <strong>Raah.ai</strong> solves the Indian Railways waitlist crisis by discovering hidden confirmed seats across the corridor.
                </p>
                <p>
                  When direct trains are full, Raah searches verified two-train transfers at safe junctions, as well as nearby feeder stations reached by train.
                </p>
                <p style={{ fontSize: '0.82rem', color: 'var(--slate)' }}>
                  Data: Grand Chord corridor timetable (54 stations, 693 trains). Seat availability is simulated per benchmark specifications.
                </p>
              </div>
              <button
                type="button"
                className="info-modal-close-btn"
                onClick={() => setShowInfoModal(false)}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
