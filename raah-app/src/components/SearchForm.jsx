import React, { useState } from 'react';
import StationPicker from './StationPicker';

export default function SearchForm({
  stations = {},
  initialValues = {},
  onSearch,
  isSearching = false,
}) {
  const [fromCode, setFromCode] = useState(initialValues.origin || 'SSM');
  const [toCode, setToCode] = useState(initialValues.destination || 'NDLS');
  const [date, setDate] = useState(initialValues.date || '2026-11-12');
  const [earliestTime, setEarliestTime] = useState(
    initialValues.earliestTime || '08:00'
  );
  const [classCode, setClassCode] = useState(initialValues.classCode || '3A');

  // Advanced section
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [safeGapPreset, setSafeGapPreset] = useState('120'); // 60, 120, 180, custom
  const [customGap, setCustomGap] = useState('120');
  const [maxWaitHours, setMaxWaitHours] = useState('10'); // 10h default
  const [includeRAC, setIncludeRAC] = useState(false);

  // Errors
  const [validationError, setValidationError] = useState('');

  const classes = ['SL', '3A', '2A', '1A'];

  function handleSwap() {
    setFromCode(toCode);
    setToCode(fromCode);
    setValidationError('');
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!fromCode || !toCode) {
      setValidationError('Please select both origin and destination stations.');
      return;
    }

    if (fromCode === toCode) {
      setValidationError('Pick two different stations');
      return;
    }

    if (!date) {
      setValidationError('Please select a journey date.');
      return;
    }

    setValidationError('');

    const safeGap =
      safeGapPreset === 'custom'
        ? parseInt(customGap, 10) || 120
        : parseInt(safeGapPreset, 10) || 120;

    const maxWait = (parseInt(maxWaitHours, 10) || 10) * 60;

    const [hours, minutes] = (earliestTime || '00:00').split(':').map(Number);
    const earliestMin = (hours || 0) * 60 + (minutes || 0);

    onSearch({
      origin: fromCode,
      destination: toCode,
      date,
      earliestTime,
      earliestMin,
      classCode,
      minGapMin: safeGap,
      maxWaitMin: maxWait,
      includeRAC,
    });
  }

  return (
    <form className="search-form" onSubmit={handleSubmit} noValidate>
      <div className="search-hero-lockup">
        <div className="hero-logo-box">
          <img
            src="/assets/logo.png"
            alt="Raah.ai Transit Logo"
            className="hero-logo-img"
            width="52"
            height="52"
          />
        </div>
        <div className="hero-text-content">
          <h1 className="hero-heading">
            Seat nahi? <span className="hero-highlight">Raah hai na.</span>
          </h1>
          <p className="hero-subtitle">
            Smart connecting trains & alternate stations when direct seats are full
          </p>
        </div>
      </div>

      <div className="stations-row">
        <StationPicker
          id="from-station"
          label="From"
          value={fromCode}
          onChange={(val) => {
            setFromCode(val);
            if (val !== toCode) setValidationError('');
          }}
          stations={stations}
        />

        <div className="swap-btn-container">
          <button
            type="button"
            className="swap-button"
            onClick={handleSwap}
            aria-label="Swap from and to stations"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="7 10 12 15 17 10" transform="rotate(-90 12 12)" />
              <polyline points="7 14 12 9 17 14" transform="rotate(90 12 12)" />
            </svg>
          </button>
        </div>

        <StationPicker
          id="to-station"
          label="To"
          value={toCode}
          onChange={(val) => {
            setToCode(val);
            if (val !== fromCode) setValidationError('');
          }}
          stations={stations}
          error={fromCode === toCode ? 'Pick two different stations' : null}
        />
      </div>

      <div className="datetime-row">
        <div className="field-group">
          <label htmlFor="journey-date" className="field-label">
            Date
          </label>
          <input
            id="journey-date"
            type="date"
            className="field-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div className="field-group">
          <label htmlFor="earliest-time" className="field-label">
            Earliest boarding
          </label>
          <input
            id="earliest-time"
            type="time"
            className="field-input"
            value={earliestTime}
            onChange={(e) => setEarliestTime(e.target.value)}
          />
          <span className="field-hint">
            Journeys you cannot reach in time are hidden.
          </span>
        </div>
      </div>

      {/* Class chips */}
      <div className="class-row">
        <span className="field-label" id="class-label">
          Class
        </span>
        <div
          className="chips-group"
          role="radiogroup"
          aria-labelledby="class-label"
        >
          {classes.map((cls) => {
            const isSelected = classCode === cls;
            return (
              <button
                type="button"
                key={cls}
                role="radio"
                aria-checked={isSelected}
                className={`chip ${isSelected ? 'selected' : ''}`}
                onClick={() => setClassCode(cls)}
              >
                {isSelected && (
                  <svg
                    width="14"
                    height="14"
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
                <span>{cls}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced section toggle */}
      <div className="advanced-toggle-row">
        <button
          type="button"
          className="advanced-toggle-btn"
          onClick={() => setShowAdvanced(!showAdvanced)}
          aria-expanded={showAdvanced}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`chevron ${showAdvanced ? 'expanded' : ''}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>Advanced filters</span>
        </button>
      </div>

      {/* Collapsed Advanced section */}
      {showAdvanced && (
        <div className="advanced-panel" role="region" aria-label="Advanced filters">
          {/* Safe gap */}
          <div className="advanced-item">
            <span className="advanced-label">Safe gap between trains:</span>
            <div className="chips-group">
              {[
                { label: '1h', value: '60' },
                { label: '2h', value: '120' },
                { label: '3h', value: '180' },
                { label: 'Custom', value: 'custom' },
              ].map((gap) => (
                <button
                  type="button"
                  key={gap.value}
                  className={`chip ${safeGapPreset === gap.value ? 'selected' : ''}`}
                  onClick={() => setSafeGapPreset(gap.value)}
                >
                  {safeGapPreset === gap.value && (
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
                  <span>{gap.label}</span>
                </button>
              ))}
            </div>
            {safeGapPreset === 'custom' && (
              <div className="custom-gap-input">
                <input
                  type="number"
                  min="30"
                  max="480"
                  className="field-input small-input"
                  value={customGap}
                  onChange={(e) => setCustomGap(e.target.value)}
                  placeholder="Minutes"
                />
                <span className="field-unit">minutes</span>
              </div>
            )}
          </div>

          {/* Max wait */}
          <div className="advanced-item">
            <label htmlFor="max-wait" className="advanced-label">
              Max wait between trains:
            </label>
            <div className="max-wait-control">
              <input
                id="max-wait"
                type="number"
                min="2"
                max="24"
                className="field-input small-input"
                value={maxWaitHours}
                onChange={(e) => setMaxWaitHours(e.target.value)}
              />
              <span className="field-unit">hours (default 10h)</span>
            </div>
          </div>

          {/* Include RAC toggle */}
          <div className="advanced-item toggle-row">
            <label className="toggle-label" htmlFor="include-rac">
              <span>Include RAC as confirmed</span>
              <input
                id="include-rac"
                type="checkbox"
                checked={includeRAC}
                onChange={(e) => setIncludeRAC(e.target.checked)}
                className="toggle-checkbox"
              />
            </label>
          </div>

          {/* 3 trains disabled */}
          <div className="advanced-item toggle-row disabled-item">
            <div className="disabled-label">
              <span>3-train journeys</span>
              <span className="coming-soon-badge">Coming soon</span>
            </div>
            <input type="checkbox" disabled className="toggle-checkbox" />
          </div>
        </div>
      )}

      {/* Global validation error if any */}
      {validationError && (
        <div className="form-error-banner" role="alert">
          {validationError}
        </div>
      )}

      {/* Primary search button */}
      <button
        type="submit"
        className="primary-button find-raah-btn"
        disabled={isSearching || fromCode === toCode}
      >
        {isSearching ? (
          <span className="btn-loading-content">
            <span className="spinner" aria-hidden="true" />
            Searching routes...
          </span>
        ) : (
          <span>Find my Raah</span>
        )}
      </button>
    </form>
  );
}

