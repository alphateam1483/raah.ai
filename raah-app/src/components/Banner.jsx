import React from 'react';

export default function Banner() {
  return (
    <aside
      className="prototype-banner"
      role="note"
      aria-label="Prototype notice"
    >
      <span className="banner-dot" aria-hidden="true" />
      <span>
        Prototype: sample 2016 timetable and <strong>SIMULATED</strong> seat availability.
      </span>
    </aside>
  );
}

