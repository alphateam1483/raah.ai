import React from 'react';

export default function LoadingSkeleton() {
  return (
    <div className="skeleton-container" aria-busy="true" aria-label="Loading routes">
      <div className="skeleton-glyph-wrapper">
        <div className="route-glyph-anim" aria-hidden="true">
          <div className="glyph-dot dot-1" />
          <div className="glyph-line" />
          <div className="glyph-dot dot-2" />
        </div>
        <p className="skeleton-status-text">Finding routes with confirmed seats...</p>
      </div>

      <div className="skeleton-card">
        <div className="skeleton-line shimmer line-head" />
        <div className="skeleton-line shimmer line-mid" />
        <div className="skeleton-line shimmer line-sub" />
      </div>

      <div className="skeleton-card">
        <div className="skeleton-line shimmer line-head" />
        <div className="skeleton-line shimmer line-mid" />
        <div className="skeleton-line shimmer line-sub" />
      </div>
    </div>
  );
}

