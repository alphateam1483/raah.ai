import React, { useState } from 'react';
import SeatBadge from './SeatBadge';
import WaitBadge from './WaitBadge';
import { formatDisplay, formatTime, formatDuration, durationMinutes } from '../lib/time';

export default function RoutePanel({
  selectedRoute,
  stations = {},
  safeGapMin = 120,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!selectedRoute) return null;

  const { type } = selectedRoute;
  const isDirect = type === 'direct';
  const isNearby = type === 'nearby';
  const isTwoTrain = type === 'twoTrain';

  // Determine nodes and segments based on the route type and chosen reach option
  // Each segment: { mode: 'train'|'road', trainNumber, trainName, fromCode, toCode, depTime, arrTime, seat, isRoad, roadMin, daysUnverified }
  // Each node: { code, name, depTime, arrTime, waitMin }
  let segments = [];
  let title = '';
  let totalMin = 0;
  let finalArr = null;

  if (isDirect) {
    const leg = selectedRoute.leg || selectedRoute;
    title = `${stations[leg.fromCode]?.name || leg.fromCode} → ${stations[leg.toCode]?.name || leg.toCode}`;
    totalMin = durationMinutes(leg.depTime, leg.arrTime);
    finalArr = leg.arrTime;
    segments = [
      {
        mode: 'train',
        train: leg.train,
        trainNumber: leg.train.number,
        trainName: leg.train.name,
        fromCode: leg.fromCode,
        toCode: leg.toCode,
        depTime: leg.depTime,
        arrTime: leg.arrTime,
        seat: leg._seat,
        isRoad: false,
        daysUnverified: leg.daysUnverified,
      },
    ];
  } else if (isNearby) {
    const reach = selectedRoute.selectedReach || selectedRoute.accessOptions?.allOptions?.[0] || {
      mode: 'road',
      roadMin: selectedRoute.roadMin,
      depTime: new Date(selectedRoute.leg.depTime.getTime() - (selectedRoute.roadMin + 30) * 60000),
      arrTime: new Date(selectedRoute.leg.depTime.getTime() - 30 * 60000),
      waitMin: 30,
    };

    const onward = selectedRoute.leg;
    title = `${stations[selectedRoute.origin || reach.fromCode || 'SSM']?.name || 'Origin'} via ${stations[selectedRoute.nearbyCode]?.name || selectedRoute.nearbyCode} → ${stations[onward.toCode]?.name || onward.toCode}`;
    finalArr = onward.arrTime;

    if (reach.mode === 'train') {
      totalMin = durationMinutes(reach.depTime, onward.arrTime);
      segments = [
        {
          mode: 'train',
          train: reach.train,
          trainNumber: reach.trainNumber,
          trainName: reach.trainName,
          fromCode: reach.fromCode,
          toCode: reach.toCode,
          depTime: reach.depTime,
          arrTime: reach.arrTime,
          seat: reach.seat,
          isRoad: false,
          waitMinAfter: reach.waitMin,
          daysUnverified: reach.daysUnverified,
        },
        {
          mode: 'train',
          train: onward.train,
          trainNumber: onward.train.number,
          trainName: onward.train.name,
          fromCode: onward.fromCode,
          toCode: onward.toCode,
          depTime: onward.depTime,
          arrTime: onward.arrTime,
          seat: onward._seat,
          isRoad: false,
          daysUnverified: onward.daysUnverified,
        },
      ];
    } else {
      // Road reach
      totalMin = (reach.roadMin || selectedRoute.roadMin) + durationMinutes(onward.depTime, onward.arrTime);
      segments = [
        {
          mode: 'road',
          fromCode: reach.fromCode || selectedRoute.origin,
          toCode: reach.toCode || selectedRoute.nearbyCode,
          depTime: reach.depTime,
          arrTime: reach.arrTime,
          isRoad: true,
          roadMin: reach.roadMin || selectedRoute.roadMin,
          waitMinAfter: reach.waitMin || 30,
          label: reach.label || `~${formatDuration(reach.roadMin || selectedRoute.roadMin)} by road (estimated)`,
        },
        {
          mode: 'train',
          train: onward.train,
          trainNumber: onward.train.number,
          trainName: onward.train.name,
          fromCode: onward.fromCode,
          toCode: onward.toCode,
          depTime: onward.depTime,
          arrTime: onward.arrTime,
          seat: onward._seat,
          isRoad: false,
          daysUnverified: onward.daysUnverified,
        },
      ];
    }
  } else if (isTwoTrain) {
    const { leg1, leg2, hubCode, waitMin } = selectedRoute;
    title = `${stations[leg1.fromCode]?.name || leg1.fromCode} via ${stations[hubCode]?.name || hubCode} → ${stations[leg2.toCode]?.name || leg2.toCode}`;
    totalMin = durationMinutes(leg1.depTime, leg2.arrTime);
    finalArr = leg2.arrTime;
    segments = [
      {
        mode: 'train',
        train: leg1.train,
        trainNumber: leg1.train.number,
        trainName: leg1.train.name,
        fromCode: leg1.fromCode,
        toCode: leg1.toCode,
        depTime: leg1.depTime,
        arrTime: leg1.arrTime,
        seat: leg1._seat,
        isRoad: false,
        waitMinAfter: waitMin,
        daysUnverified: leg1.daysUnverified,
      },
      {
        mode: 'train',
        train: leg2.train,
        trainNumber: leg2.train.number,
        trainName: leg2.train.name,
        fromCode: leg2.fromCode,
        toCode: leg2.toCode,
        depTime: leg2.depTime,
        arrTime: leg2.arrTime,
        seat: leg2._seat,
        isRoad: false,
        daysUnverified: leg2.daysUnverified,
      },
    ];
  }

  return (
    <section
      className="route-panel"
      aria-label="Selected Journey Route Timeline"
    >
      <div className="route-panel-header">
        <div className="header-left">
          <span className="route-panel-badge">Selected Journey</span>
          <h3 className="route-panel-title">{title}</h3>
          <span className="route-panel-meta">
            Total {formatDuration(totalMin)} · Arrive {finalArr ? formatDisplay(finalArr) : ''}
          </span>
        </div>
        <button
          type="button"
          className="collapse-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-expanded={!isCollapsed}
          aria-label={isCollapsed ? 'Expand route timeline' : 'Collapse route timeline'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`chevron ${!isCollapsed ? 'expanded' : ''}`}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {!isCollapsed && (
        <div className="route-panel-timeline">
          {segments.map((seg, idx) => {
            const fromStationName = stations[seg.fromCode]?.name || seg.fromCode;
            const toStationName = stations[seg.toCode]?.name || seg.toCode;
            const isLast = idx === segments.length - 1;

            return (
              <div key={`seg-${idx}`} className="panel-timeline-block">
                {/* Departure node */}
                <div className="panel-node departure-node">
                  <span
                    className={`panel-node-bullet ${
                      idx === 0 ? 'white-bullet' : 'junction-bullet'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="panel-node-content">
                    <span className="panel-station-name">{fromStationName}</span>
                    <span className="panel-station-time">
                      {seg.depTime ? (
                        <>
                          <span className="node-day">{formatDisplay(seg.depTime).split(' ')[0]}</span>{' '}
                          <strong className="tabular-time">{formatTime(seg.depTime)}</strong>
                        </>
                      ) : (
                        'Departure'
                      )}
                    </span>
                  </div>
                </div>

                {/* Connecting Line and Leg Details */}
                <div className="panel-line-segment">
                  <div className="line-wrapper">
                    <div
                      className={`panel-path-line ${
                        seg.isRoad ? 'path-dashed' : 'path-solid animated-draw'
                      }`}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="panel-segment-card">
                    <div className="panel-leg-header">
                      {seg.isRoad ? (
                        <span className="mode-tag road-tag">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="1" y="3" width="15" height="13" />
                            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                            <circle cx="5.5" cy="18.5" r="2.5" />
                            <circle cx="18.5" cy="18.5" r="2.5" />
                          </svg>
                          <span>{seg.label}</span>
                        </span>
                      ) : (
                        <div className="mode-tag train-tag">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                          <span className="train-id">
                            {seg.trainNumber} {seg.trainName}
                          </span>
                        </div>
                      )}

                      {seg.seat && (
                        <SeatBadge seat={seg.seat} showCaption={true} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrival at next node */}
                <div className="panel-node arrival-node">
                  <span
                    className={`panel-node-bullet ${
                      isLast ? 'white-bullet' : 'junction-bullet'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="panel-node-content">
                    <span className="panel-station-name">{toStationName}</span>
                    <span className="panel-station-time">
                      {seg.arrTime ? (
                        <>
                          <span className="node-day">{formatDisplay(seg.arrTime).split(' ')[0]}</span>{' '}
                          <strong className="tabular-time">{formatTime(seg.arrTime)}</strong>
                        </>
                      ) : (
                        'Arrival'
                      )}
                    </span>
                  </div>
                </div>

                {/* Wait badge at intermediate junction if there is a next leg */}
                {seg.waitMinAfter !== undefined && !isLast && (
                  <div className="panel-wait-row">
                    <WaitBadge waitMin={seg.waitMinAfter} safeGapMin={safeGapMin} />
                    <span className="wait-subtext">
                      waiting gap at {toStationName}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

