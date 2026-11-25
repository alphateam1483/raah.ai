import React from 'react';
import Banner from './Banner';

export default function Header({ onHomeClick, showTagline = false }) {
  return (
    <header className="app-header">
      <div className="header-top">
        <button
          type="button"
          className="brand-button"
          onClick={onHomeClick}
          aria-label="Raah.ai Home"
        >
          <img
            src="/assets/logo.png"
            alt="Raah.ai Logo"
            className="brand-logo-img"
            width="32"
            height="32"
          />
          <span className="brand-text">
            <span className="brand-title">Raah</span>
            <span className="brand-dot">.ai</span>
          </span>
        </button>
        {showTagline && (
          <span className="brand-tagline">Seat nahi? Raah hai na.</span>
        )}
      </div>
      <Banner />
    </header>
  );
}

