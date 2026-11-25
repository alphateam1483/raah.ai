import React from 'react';

export default function SeatBadge({ seat, showCaption = false }) {
  if (!seat) return null;

  const { status, count } = seat;

  let statusClass = 'seat-avl';
  let icon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  if (status === 'RAC') {
    statusClass = 'seat-rac';
    icon = (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    );
  } else if (status === 'WL') {
    statusClass = 'seat-wl';
    icon = (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }

  return (
    <div className="seat-badge-container">
      <span className={`seat-badge ${statusClass}`} aria-label={`Seat status: ${status} ${count}`}>
        <span className="badge-icon">{icon}</span>
        <span className="badge-text">{status} {count}</span>
      </span>
      {showCaption && (
        <span className="simulated-caption" aria-label="Simulated status">
          Simulated
        </span>
      )}
    </div>
  );
}

