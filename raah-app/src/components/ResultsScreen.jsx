import React, { useState, useMemo } from 'react';
import DirectTrainsBlock from './DirectTrainsBlock';
import ResultCard from './ResultCard';
import RoutePanel from './RoutePanel';
import { formatDayDate, parseDateUTC } from '../lib/time';
import { sortAndCap } from '../lib/search';
import { getAccessOptions } from '../lib/access';

export default function ResultsScreen({
  query,
  results,
  stations = {},
  corridorData,
  stationIndex,
  onEditSearch,
}) {
  const [activeTab, setActiveTab] = useState('nearby'); // 'nearby' or 'twoTrain'
  const [sortBy, setSortBy] = useState('earliest-arrival');

  // Map of user-selected reach option per nearby route key
  const [selectedReachMap, setSelectedReachMap] = useState({});

  // Enrich nearby items with access options (Phase 2b)
  // When distance > 10 km, we do not show by road; we must show train options!
  const enrichedNearbyItems = useMemo(() => {
    if (!results?.nearby || !corridorData || !stationIndex) {
      return results?.nearby || [];
    }
    const journeyDate = parseDateUTC(query.date);
    const enriched = [];

    for (const item of results.nearby) {
      const km =
        item.roadKm ||
        corridorData.nearby[query.origin]?.find((x) => x.code === item.nearbyCode)?.km ||
        0;

      const access = getAccessOptions(
        {
          origin: query.origin,
          nearbyCode: item.nearbyCode,
          onwardDepartureTime: item.leg.depTime,
          onwardTrainNumber: item.leg.train.number,
          journeyDate,
          earliestMin: query.earliestMin || 0,
          minGapMin: query.minGapMin || 120,
          classCode: query.classCode || '3A',
          includeRAC: query.includeRAC || false,
        },
        corridorData,
        stationIndex
      );

      // If distance > 10 km, we must have train access: do not show road
      if (km > 10 && access.trains.length === 0) {
        continue;
      }

      const routeKey = `${item.nearbyCode}-${item.leg.train.number}-${item.leg.originStartDate}`;
      const defaultReach =
        access.trains.length > 0
          ? access.trains[0]
          : km <= 10
            ? access.road
            : null;
      const activeReach = selectedReachMap[routeKey] || defaultReach;

      enriched.push({
        ...item,
        roadKm: km,
        origin: query.origin,
        accessOptions: access,
        selectedReach: activeReach,
      });
    }

    return enriched;
  }, [results?.nearby, query, corridorData, stationIndex, selectedReachMap]);

  const twoTrainItems = results?.twoTrain || [];
  const directItems = results?.direct || [];

  // Default active tab to whichever has results if one is empty
  const currentTab =
    activeTab === 'nearby' && enrichedNearbyItems.length === 0 && twoTrainItems.length > 0
      ? 'twoTrain'
      : activeTab;

  const currentItems = currentTab === 'nearby' ? enrichedNearbyItems : twoTrainItems;
  const cappedSortedItems = sortAndCap(currentItems, sortBy, 10);

  // Selected route state for the RoutePanel (first card selected by default per Phase 2b item 4)
  const [selectedRoute, setSelectedRoute] = useState(() => {
    if (enrichedNearbyItems.length > 0) return enrichedNearbyItems[0];
    if (twoTrainItems.length > 0) return twoTrainItems[0];
    if (directItems.length > 0) return { type: 'direct', leg: directItems[0] };
    return null;
  });

  const fromName = stations[query.origin]?.name || query.origin;
  const toName = stations[query.destination]?.name || query.destination;
  const dateFormatted = formatDayDate(parseDateUTC(query.date));

  // Handler when user selects a card
  function handleSelectCard(item) {
    setSelectedRoute(item);
  }

  // Handler when user selects a direct train
  function handleSelectDirect(item) {
    setSelectedRoute({ type: 'direct', leg: item });
  }

  // Handler when user selects a specific reach option on a nearby card (Phase 2b item 3)
  function handleSelectReachOption(nearbyItem, reachOption) {
    const routeKey = `${nearbyItem.nearbyCode}-${nearbyItem.leg.train.number}-${nearbyItem.leg.originStartDate}`;
    setSelectedReachMap((prev) => ({
      ...prev,
      [routeKey]: reachOption,
    }));
    const updated = {
      ...nearbyItem,
      selectedReach: reachOption,
    };
    setSelectedRoute(updated);
  }

  return (
    <div className="results-screen" aria-live="polite">
      {/* Sticky Edit search bar on mobile */}
      <div className="sticky-edit-bar">
        <div className="edit-summary-text">
          <strong>{fromName} → {toName}</strong>
          <span className="edit-sub">
            {dateFormatted} · {query.classCode}
          </span>
        </div>
        <button
          type="button"
          className="edit-search-btn"
          onClick={onEditSearch}
        >
          Edit search
        </button>
      </div>

      {/* Main summary line */}
      <div className="results-summary-header">
        <h2 className="summary-title">
          {fromName} to {toName}
        </h2>
        <p className="summary-meta">
          {dateFormatted} · Class {query.classCode}
        </p>
      </div>

      {/* Route Panel at the top of results (Phase 2b items 3, 4, 5) */}
      {selectedRoute && (
        <RoutePanel
          selectedRoute={selectedRoute}
          stations={stations}
          safeGapMin={query.minGapMin || 120}
        />
      )}

      {/* 1. Direct trains (always shown) */}
      <DirectTrainsBlock
        directTrains={directItems}
        stations={stations}
        selectedRoute={selectedRoute}
        onSelectDirectTrain={handleSelectDirect}
      />

      {/* 2. Tabs: Nearby station and Two trains */}
      <div className="alternatives-section">
        <div className="tabs-header" role="tablist" aria-label="Route alternatives">
          <button
            type="button"
            role="tab"
            id="tab-nearby"
            aria-selected={currentTab === 'nearby'}
            aria-controls="panel-nearby"
            className={`tab-btn ${currentTab === 'nearby' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('nearby');
              if (enrichedNearbyItems.length > 0) {
                setSelectedRoute(enrichedNearbyItems[0]);
              }
            }}
          >
            <span>Nearby station</span>
            <span className="tab-count-pill">{enrichedNearbyItems.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            id="tab-two-train"
            aria-selected={currentTab === 'twoTrain'}
            aria-controls="panel-two-train"
            className={`tab-btn ${currentTab === 'twoTrain' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('twoTrain');
              if (twoTrainItems.length > 0) {
                setSelectedRoute(twoTrainItems[0]);
              }
            }}
          >
            <span>Two trains</span>
            <span className="tab-count-pill">{twoTrainItems.length}</span>
          </button>
        </div>

        {/* 3. Sort chips */}
        {currentItems.length > 0 && (
          <div className="sort-bar">
            <span className="sort-label">Sort:</span>
            <div className="chips-group" role="radiogroup" aria-label="Sort options">
              {[
                { id: 'earliest-arrival', label: 'Earliest arrival' },
                { id: 'shortest-time', label: 'Shortest total time' },
                ...(currentTab === 'nearby' && currentItems.some((x) => x.selectedReach?.mode === 'road')
                  ? [{ id: 'least-road', label: 'Least road travel' }]
                  : []),
              ].map((opt) => {
                const isSelected = sortBy === opt.id;
                return (
                  <button
                    type="button"
                    key={opt.id}
                    role="radio"
                    aria-checked={isSelected}
                    className={`chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSortBy(opt.id)}
                  >
                    {isSelected && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="chip-check-icon"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Results list or Empty state */}
        <div
          id={currentTab === 'nearby' ? 'panel-nearby' : 'panel-two-train'}
          role="tabpanel"
          aria-labelledby={currentTab === 'nearby' ? 'tab-nearby' : 'tab-two-train'}
          className="cards-list"
        >
          {cappedSortedItems.length === 0 ? (
            <div className="empty-results-box" role="status">
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="empty-icon"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <h3 className="empty-heading">No confirmed route found</h3>
              <p className="empty-sub">
                Try a different date, a longer wait, or another class.
              </p>
              <button
                type="button"
                className="secondary-button"
                onClick={onEditSearch}
              >
                Adjust search filters
              </button>
            </div>
          ) : (
            cappedSortedItems.map((item, index) => {
              const isSelected =
                (selectedRoute?.type === item.type &&
                  (item.type === 'nearby'
                    ? selectedRoute.leg?.train?.number === item.leg?.train?.number &&
                      selectedRoute.nearbyCode === item.nearbyCode
                    : selectedRoute.leg1?.train?.number === item.leg1?.train?.number &&
                      selectedRoute.leg2?.train?.number === item.leg2?.train?.number &&
                      selectedRoute.hubCode === item.hubCode)) ||
                (!selectedRoute && index === 0);

              return (
                <ResultCard
                  key={
                    item.type === 'nearby'
                      ? `nearby-${item.nearbyCode}-${item.leg.train.number}-${index}`
                      : `two-${item.hubCode}-${item.leg1.train.number}-${item.leg2.train.number}-${index}`
                  }
                  item={item}
                  stations={stations}
                  safeGapMin={query.minGapMin || 120}
                  cardIndex={index}
                  isSelected={isSelected}
                  onSelectCard={handleSelectCard}
                  onSelectReachOption={handleSelectReachOption}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
