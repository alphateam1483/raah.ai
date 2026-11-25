import React, { useState, useEffect, useRef } from 'react';

/**
 * SplashScreen for raah.ai
 *
 * Plays the official video animation (raah_logo_animation.mp4):
 * - Seamless full-bleed presentation matching video background (#4a166d).
 * - No box container, no border-radius, no drop shadow.
 * - No skip button.
 * - When the video ends, smoothly fades out over 500ms to reveal the web app.
 */
export default function SplashScreen({ onComplete }) {
  const [isFading, setIsFading] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }

    // Safety fallback in case video stalls
    const fallbackTimer = setTimeout(() => {
      triggerFadeOut();
    }, 4200);

    return () => clearTimeout(fallbackTimer);
  }, []);

  function triggerFadeOut() {
    setIsFading(true);
    setTimeout(() => {
      setIsRemoved(true);
      if (onComplete) onComplete();
    }, 500);
  }

  function handleVideoEnded() {
    triggerFadeOut();
  }

  if (isRemoved) return null;

  return (
    <div
      id="splash-screen"
      className={isFading ? 'fade-out' : ''}
      role="banner"
      aria-label="raah.ai startup logo animation"
    >
      <video
        ref={videoRef}
        className="splash-video"
        src="/assets/raah_logo_animation.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnded}
      />
    </div>
  );
}
