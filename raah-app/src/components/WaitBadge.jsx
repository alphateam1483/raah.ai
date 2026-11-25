import React from 'react';
import { formatDuration } from '../lib/time';

export default function WaitBadge({ waitMin, safeGapMin = 120 }) {
  const durationStr = formatDuration(waitMin);

  let badgeType = 'wait-safe';
  let label = `Safe ${durationStr}`;

  if (waitMin < safeGapMin) {
    badgeType = 'wait-tight';
    label = `Tight ${durationStr}`;
  } else if (waitMin < 180) {
    // 2h to < 3h
    badgeType = 'wait-ok';
    label = `OK ${durationStr}`;
  } else {
    badgeType = 'wait-safe';
    label = `Safe ${durationStr}`;
  }

  return (
    <div className={`wait-badge ${badgeType}`} role="status">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span>Wait: {label}</span>
    </div>
  );
}

