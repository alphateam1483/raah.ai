import React from 'react';
import SeatBadge from './SeatBadge';
import { formatDisplay, formatTime } from '../lib/time';

export default function DirectTrainsBlock({
  directTrains = [],
  stations = {},
  selectedRoute = null,
  onSelectDirectTrain,
}) {
  if (!directTrains || directTrains.length === 0) {
    return (
      <section className="direct-trains-card" aria-labelledby="direct-trains-title">
        <h3 id="direct-trains-title" className="section-title">
          Direct Trains
        </h3>
        <p className="no-direct-trains">
          No direct trains running on this timetable.
        </p>
      </section>
    );
  }

  const hasConfirmed = directTrains.some(
    (t) => t._seat?.status === 'AVL' || t._seat?.status === 'RAC'
  );

  return (
    <section
      className={`direct-trains-card ${!hasConfirmed ? 'all-full' : ''}`}
      aria-labelledby="direct-trains-title"
    >
      <div className="direct-header">
        <h3 id="direct-trains-title" className="section-title">
          Direct Trains
        </h3>
        <span className="direct-count-badge">
          {directTrains.length} {directTrains.length === 1 ? 'train' : 'trains'}
        </span>
      </div>

      {!hasConfirmed && (
        <div className="direct-full-alert" role="alert">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>No confirmed seat on direct trains</span>
        </div>
      )}

      <div className="direct-trains-list" role="list">
        {directTrains.map((item, idx) => {
          const train = item.train;
          const depTime = item.depTime;
          const arrTime = item.arrTime;
          const fromName = stations[item.fromCode]?.name || item.fromCode;
          const toName = stations[item.toCode]?.name || item.toCode;

          const isSelected =
            selectedRoute?.type === 'direct' &&
            (selectedRoute.train?.number === train.number ||
              selectedRoute.leg?.train?.number === train.number);

          return (
            <div
              key={`${train.number}-${item.originStartDate}-${idx}`}
              className={`direct-train-row ${!hasConfirmed ? 'subdued-row' : ''} ${
                isSelected ? 'selected-direct-row' : ''
              }`}
              onClick={() => onSelectDirectTrain && onSelectDirectTrain(item)}
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectDirectTrain && onSelectDirectTrain(item);
                }
              }}
              aria-label={`Direct train ${train.number} ${train.name}. Click to view in route timeline.`}
            >
              <div className="train-id-col">
                <span className="train-number">{train.number}</span>
                <span className="train-name">{train.name}</span>
                {isSelected && (
                  <span className="row-active-tag">Active in panel</span>
                )}
              </div>

              <div className="train-times-col">
                <div className="time-point">
                  <span className="point-time">{formatTime(depTime)}</span>
                  <span className="point-day">{formatDisplay(depTime).split(' ')[0]}</span>
                  <span className="point-stn">{fromName}</span>
                </div>
                <div className="time-arrow" aria-hidden="true">
                  →
                </div>
                <div className="time-point">
                  <span className="point-time">{formatTime(arrTime)}</span>
                  <span className="point-day">{formatDisplay(arrTime).split(' ')[0]}</span>
                  <span className="point-stn">{toName}</span>
                </div>
              </div>

              <div className="train-seat-col">
                <SeatBadge seat={item._seat} showCaption={idx === 0} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
