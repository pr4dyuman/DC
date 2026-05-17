"use client";

import { useEffect, useState } from "react";

const words = [
  "DIGITAL INNOVATION!",
  "Storytelling",
  "SEO Excellence",
  "Creative Strategy",
  "Analytics Intelligence",
  "Brand Storytelling",
];

export default function HomeRotatingWord() {
  const [index, setIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setIsAnimating(false);
      }, 800);
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  return (
    <span
      className="absolute inset-0 flex items-center transition-all duration-[800ms] ease-in-out"
      style={{
        transform: isAnimating ? "translateY(-100%)" : "translateY(0)",
        opacity: isAnimating ? 0 : 1,
      }}
    >
      {words[index]}
    </span>
  );
}
