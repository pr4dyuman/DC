"use client";

import { useEffect, useRef, useState } from "react";

// Completes the homepage headline "More customers from …": one word per
// service, so the rotation shows what Digital Corvids actually does.
const words = [
  "Google Search",
  "Paid Ads",
  "Social Media",
  "Your Website",
  "Video Ads",
  "Influencers",
];

export default function HomeRotatingWord() {
  const wordRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasRotated, setHasRotated] = useState(false);

  useEffect(() => {
    const word = wordRef.current;
    if (!word) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const getWordVisibility = () => {
      const rect = word.getBoundingClientRect();
      return rect.bottom > 0 && rect.top < window.innerHeight;
    };

    let isVisible = getWordVisibility();
    let rotationTimer;
    let transitionTimer;

    const clearTimers = () => {
      window.clearInterval(rotationTimer);
      window.clearTimeout(transitionTimer);
      rotationTimer = undefined;
      transitionTimer = undefined;
    };

    const shouldRotate = () =>
      isVisible && document.visibilityState === "visible" && !motionQuery.matches;

    const rotateWord = () => {
      if (!shouldRotate()) return;

      setIsAnimating(true);
      transitionTimer = window.setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setHasRotated(true);
        setIsAnimating(false);
      }, 800);
    };

    const syncRotation = () => {
      clearTimers();
      setIsAnimating(false);

      if (shouldRotate()) {
        rotationTimer = window.setInterval(rotateWord, 3600);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextVisible = entry.isIntersecting || getWordVisibility();

        if (nextVisible === isVisible) return;

        isVisible = nextVisible;
        syncRotation();
      },
      { rootMargin: "120px 0px", threshold: 0.2 },
    );

    observer.observe(word);
    document.addEventListener("visibilitychange", syncRotation);

    if (motionQuery.addEventListener) {
      motionQuery.addEventListener("change", syncRotation);
    } else {
      motionQuery.addListener(syncRotation);
    }

    syncRotation();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncRotation);

      if (motionQuery.removeEventListener) {
        motionQuery.removeEventListener("change", syncRotation);
      } else {
        motionQuery.removeListener(syncRotation);
      }

      clearTimers();
    };
  }, []);

  return (
    <span
      ref={wordRef}
      data-home-rotating-word
      className="absolute inset-0 flex items-center transition-all duration-[800ms] ease-in-out"
      style={{
        transform: isAnimating ? "translateY(-100%)" : "translateY(0)",
        opacity: isAnimating ? 0 : 1,
      }}
    >
      <span className="inline-flex flex-col gap-[0.06em]">
        {words[index]}
        {/* Marker underline, redrawn for each word (styles in globals.css). */}
        <svg
          key={index}
          aria-hidden="true"
          viewBox="0 0 600 24"
          preserveAspectRatio="none"
          fill="none"
          className="block h-[0.16em] w-full"
        >
          <path
            className={hasRotated ? "dc-marker-underline" : "dc-marker-underline dc-marker-underline-intro"}
            pathLength="1"
            d="M4 15 C 120 5, 260 19, 420 10 S 560 7, 596 13"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </span>
  );
}
