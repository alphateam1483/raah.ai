import React from 'react';
import SeatBadge from './SeatBadge';
import WaitBadge from './WaitBadge';
import {
  formatDisplay,
  formatTime,
  formatDuration,
  durationMinutes,
} from '../lib/time';

export default function ResultCard({
  item,
  stations = {},
  safeGapMin = 120,
  cardIndex = 0,
  isSelected = false,
  onSelectCard,
  onSelectReachOption,
}) {
  const isNearby = item.type === 'nearby';
  const isTwoTrain = item.type === 'twoTrain';
  const isDirect = item.type === 'direct';

  let totalDurationMin = 0;
  let finalArrival = null;
  let summaryTag = '';
  let daysUnverified = false;

  // Active reach option for nearby card
  const selectedReach =
    item.selectedReach || item.accessOptions?.allOptions?.[0];

  if (isNearby) {
    const onward = item.leg;
    if (selectedReach?.mode === 'train') {
      totalDurationMin = durationMinutes(selectedReach.depTime, onward.arrTime);
      summaryTag = '2 trains (nearby)';
    } else {
      const roadTime = selectedReach?.roadMin || item.roadMin || 0;
      totalDurationMin = roadTime + durationMinutes(onward.depTime, onward.arrTime);
      summaryTag = 'road + 1 train';
    }
    finalArrival = onward.arrTime;
    daysUnverified = onward.daysUnverified || selectedReach?.daysUnverified;
  } else if (isTwoTrain) {
    const leg1 = item.leg1;
    const leg2 = item.leg2;
    totalDurationMin = durationMinutes(leg1.depTime, leg2.arrTime);
    finalArrival = leg2.arrTime;
    summaryTag = '2 trains';
    daysUnverified = leg1.daysUnverified || leg2.daysUnverified;
  } else if (isDirect) {
    const leg = item.leg || item;
    totalDurationMin = durationMinutes(leg.depTime, leg.arrTime);
    finalArrival = leg.arrTime;
    summaryTag = 'direct';
    daysUnverified = leg.daysUnverified;
  }

  const arrivalDisplay = finalArrival ? formatDisplay(finalArrival) : '';
  const nearbyStationName = isNearby
    ? stations[item.nearbyCode]?.name || item.nearbyCode
    : '';

  return (
    <article
      className={`result-card ${isSelected ? 'selected-card' : ''}`}
      onClick={() => onSelectCard && onSelectCard(item)}
      aria-label={`Route option ${cardIndex + 1} (${summaryTag})`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelectCard && onSelectCard(item);
        }
      }}
    >
      {/* Top summary row */}
      <div className="card-top-summary">
        <div className="summary-left">
          <span className="summary-arrival">Arrive {arrivalDisplay}</span>
          <span className="summary-duration tabular-time">
            {formatDuration(totalDurationMin)} total
          </span>
        </div>
        <div className="summary-badges-right">
          {isSelected && (
            <span className="active-pill" aria-label="Currently viewed in route panel">
              Active in panel
            </span>
          )}
          <span className="summary-pill">{summaryTag}</span>
        </div>
      </div>

      <div className="card-divider" />

      {/* Reach section for Nearby Cards */}
      {isNearby && item.accessOptions?.allOptions?.length > 0 && (
        <div
          className="reach-station-section"
          onClick={(e) => e.stopPropagation()} // don't re-trigger outer card click
        >
          <div className="reach-header">
            <span className="reach-title">
              {item.accessOptions?.trains?.length > 0 ? (
                <>Connecting trains to <strong>{nearbyStationName}</strong>:</>
              ) : (
                <>Ways to reach <strong>{nearbyStationName}</strong>:</>
              )}
            </span>
            <span className="reach-hint">
              Tap a connecting train to update your route timeline
            </span>
          </div>

          <div
            className="reach-options-list"
            role="radiogroup"
            aria-label={`Options to reach ${nearbyStationName}`}
          >
            {item.accessOptions.allOptions.map((opt, rIdx) => {
              const isOptSelected =
                (selectedReach?.id && selectedReach.id === opt.id) ||
                (!selectedReach && rIdx === 0);

              return (
                <button
                  type="button"
                  key={opt.id || `opt-${rIdx}`}
                  role="radio"
                  aria-checked={isOptSelected}
                  className={`reach-option-row ${isOptSelected ? 'selected-reach' : ''}`}
                  onClick={() => {
                    onSelectReachOption && onSelectReachOption(item, opt);
                  }}
                >
                  <div className="reach-row-left">
                    <span className="reach-mode-icon" aria-hidden="true">
                      {opt.mode === 'road' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" />
                          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" />
                          <line x1="8" y1="21" x2="16" y2="21" />
                          <line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      )}
                    </span>

                    <div className="reach-info-col">
                      <span className="reach-name">
                        {opt.mode === 'road'
                          ? `Road (~${formatDuration(opt.roadMin)})`
                          : `${opt.trainNumber} ${opt.trainName}`}
                      </span>
                      <span className="reach-times">
                        {formatDisplay(opt.depTime).split(' ')[0]}{' '}
                        <strong className="tabular-time">{formatTime(opt.depTime)}</strong> →{' '}
                        {formatDisplay(opt.arrTime).split(' ')[0]}{' '}
                        <strong className="tabular-time">{formatTime(opt.arrTime)}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="reach-row-right">
                    {opt.seat && (
                      <SeatBadge seat={opt.seat} showCaption={true} />
                    )}
                    <WaitBadge waitMin={opt.waitMin} safeGapMin={safeGapMin} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main timeline details */}
      <div className="timeline-container">
        {/* Nearby journey: Reach by Train */}
        {isNearby && selectedReach?.mode === 'train' && (
          <>
            <div className="timeline-segment train-segment">
              <div className="timeline-gutter">
                <span className="node-icon train-node" aria-hidden="true" />
                <div className="solid-line" aria-hidden="true" />
                <span className="node-icon junction-node" aria-hidden="true" />
              </div>
              <div className="segment-details">
                <div className="train-header-line">
                  <span className="train-title">
                    Train 1 (to {nearbyStationName}): {selectedReach.trainNumber} {selectedReach.trainName}
                  </span>
                  <SeatBadge seat={selectedReach.seat} showCaption={true} />
                </div>
                <div className="train-time-route">
                  <span className="time-block">
                    {formatDisplay(selectedReach.depTime).split(' ')[0]}{' '}
                    <strong className="tabular-time">{formatTime(selectedReach.depTime)}</strong>{' '}
                    {stations[selectedReach.fromCode]?.name || selectedReach.fromCode}
                  </span>
                  <span className="route-arrow">→</span>
                  <span className="time-block">
                    {formatDisplay(selectedReach.arrTime).split(' ')[0]}{' '}
                    <strong className="tabular-time">{formatTime(selectedReach.arrTime)}</strong>{' '}
                    {stations[selectedReach.toCode]?.name || selectedReach.toCode}
                  </span>
                </div>
              </div>
            </div>

            <div className="timeline-wait-row">
              <div className="timeline-gutter">
                <div className="dashed-line short-dashed" aria-hidden="true" />
              </div>
              <div className="wait-badge-wrapper">
                <WaitBadge waitMin={selectedReach.waitMin} safeGapMin={safeGapMin} />
                <span className="junction-name-hint">
                  transfer at {nearbyStationName}
                </span>
              </div>
            </div>

            <div className="timeline-segment train-segment">
              <div className="timeline-gutter">
                <span className="node-icon junction-node" aria-hidden="true" />
                <div className="solid-line" aria-hidden="true" />
                <span className="node-icon end-node" aria-hidden="true" />
              </div>
              <div className="segment-details">
                <div className="train-header-line">
                  <span className="train-title">
                    Train 2 (onward): {item.leg.train.number} {item.leg.train.name}
                  </span>
                  <SeatBadge seat={item.leg._seat} showCaption={false} />
                </div>
                <div className="train-time-route">
                  <span className="time-block">
                    {formatDisplay(item.leg.depTime).split(' ')[0]}{' '}
                    <strong className="tabular-time">{formatTime(item.leg.depTime)}</strong>{' '}
                    {stations[item.leg.fromCode]?.name || item.leg.fromCode}
                  </span>
                  <span className="route-arrow">→</span>
                  <span className="time-block">
                    {formatDisplay(item.leg.arrTime).split(' ')[0]}{' '}
                    <strong className="tabular-time">{formatTime(item.leg.arrTime)}</strong>{' '}
                    {stations[item.leg.toCode]?.name || item.leg.toCode}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Nearby journey: Reach by Road */}
        {isNearby && selectedReach?.mode === 'road' && (
          <>
            <div className="timeline-segment road-segment">
              <div className="timeline-gutter">
                <span className="node-icon road-node" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </span>
                <div className="dashed-line" aria-hidden="true" />
              </div>
              <div className="segment-details">
                <div className="road-info-row">
                  <span className="road-route-title">
                    {stations[selectedReach.fromCode || item.origin]?.name || item.origin} to {nearbyStationName}
                  </span>
                  <span className="road-estimate-text">
                    ~{formatDuration(selectedReach.roadMin || item.roadMin)} by road (estimated)
                  </span>
                </div>
              </div>
            </div>

            <div className="timeline-wait-row">
              <div className="timeline-gutter">
                <div className="dashed-line short-dashed" aria-hidden="true" />
              </div>
              <div className="wait-badge-wrapper">
                <WaitBadge waitMin={30} safeGapMin={safeGapMin} />
                <span className="junction-name-hint">
                  buffer at {nearbyStationName}
                </span>
              </div>
            </div>

            <div className="timeline-segment train-segment">
              <div className="timeline-gutter">
                <span className="node-icon junction-node" aria-hidden="true" />
                <div className="solid-line" aria-hidden="true" />
                <span className="node-icon end-node" aria-hidden="true" />
              </div>
              <div className="segment-details">
                <div className="train-header-line">
                  <span className="train-title">
                    Onward: {item.leg.train.number} {item.leg.train.name}
                  </span>
                  <SeatBadge seat={item.leg._seat} showCaption={true} />
                </div>
                <div className="train-time-route">
                  <span className="time-block">
                    {formatDisplay(item.leg.depTime).split(' ')[0]}{' '}
                    <strong className="tabular-time">{formatTime(item.leg.depTime)}</strong>{' '}
                    {stations[item.leg.fromCode]?.name || item.leg.fromCode}
                  </span>
                  <span className="route-arrow">→</span>
                  <span className="time-block">
                    {formatDisplay(item.leg.arrTime).split(' ')[0]}{' '}
                    <strong className="tabular-time">{formatTime(item.leg.arrTime)}</strong>{' '}
                    {stations[item.leg.toCode]?.name || item.leg.toCode}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Two-train leg 1 */}
        {isTwoTrain && (
          <div className="timeline-segment train-segment">
            <div className="timeline-gutter">
              <span className="node-icon train-node" aria-hidden="true" />
              <div className="solid-line" aria-hidden="true" />
              <span className="node-icon junction-node" aria-hidden="true" />
            </div>
            <div className="segment-details">
              <div className="train-header-line">
                <span className="train-title">
                  {item.leg1.train.number} {item.leg1.train.name}
                </span>
                <SeatBadge seat={item.leg1._seat} showCaption={true} />
              </div>
              <div className="train-time-route">
                <span className="time-block">
                  {formatDisplay(item.leg1.depTime).split(' ')[0]}{' '}
                  <strong className="tabular-time">{formatTime(item.leg1.depTime)}</strong>{' '}
                  {stations[item.leg1.fromCode]?.name || item.leg1.fromCode}
                </span>
                <span className="route-arrow">→</span>
                <span className="time-block">
                  {formatDisplay(item.leg1.arrTime).split(' ')[0]}{' '}
                  <strong className="tabular-time">{formatTime(item.leg1.arrTime)}</strong>{' '}
                  {stations[item.leg1.toCode]?.name || item.leg1.toCode}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Two-train wait junction */}
        {isTwoTrain && (
          <div className="timeline-wait-row">
            <div className="timeline-gutter">
              <div className="dashed-line short-dashed" aria-hidden="true" />
            </div>
            <div className="wait-badge-wrapper">
              <WaitBadge waitMin={item.waitMin} safeGapMin={safeGapMin} />
              <span className="junction-name-hint">
                at {stations[item.hubCode]?.name || item.hubCode}
              </span>
            </div>
          </div>
        )}

        {/* Two-train leg 2 */}
        {isTwoTrain && (
          <div className="timeline-segment train-segment">
            <div className="timeline-gutter">
              <span className="node-icon junction-node" aria-hidden="true" />
              <div className="solid-line" aria-hidden="true" />
              <span className="node-icon end-node" aria-hidden="true" />
            </div>
            <div className="segment-details">
              <div className="train-header-line">
                <span className="train-title">
                  {item.leg2.train.number} {item.leg2.train.name}
                </span>
                <SeatBadge seat={item.leg2._seat} showCaption={false} />
              </div>
              <div className="train-time-route">
                <span className="time-block">
                  {formatDisplay(item.leg2.depTime).split(' ')[0]}{' '}
                  <strong className="tabular-time">{formatTime(item.leg2.depTime)}</strong>{' '}
                  {stations[item.leg2.fromCode]?.name || item.leg2.fromCode}
                </span>
                <span className="route-arrow">→</span>
                <span className="time-block">
                  {formatDisplay(item.leg2.arrTime).split(' ')[0]}{' '}
                  <strong className="tabular-time">{formatTime(item.leg2.arrTime)}</strong>{' '}
                  {stations[item.leg2.toCode]?.name || item.leg2.toCode}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card-divider" />

      {/* Card Footer */}
      <div className="card-footer" onClick={(e) => e.stopPropagation()}>
        <div className="booking-tip-line">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Tip: Book the leg that sells out first, first.</span>
        </div>

        <div className="booking-action-row">
          <div className="booking-disclaimer">
            <span>Raah only plans. Book on IRCTC.</span>
            <div className="simulated-meta">
              Simulated seats. {daysUnverified ? 'Days unverified.' : ''}
            </div>
          </div>

          <a
            href="https://www.irctc.co.in"
            target="_blank"
            rel="noopener noreferrer"
            className="secondary-button irctc-button"
            aria-label="Book on IRCTC (opens in new tab)"
          >
            <span>Book on IRCTC</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}
