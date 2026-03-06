"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function CountUp({ end, duration = 2, suffix = "", decimals = 0 }) {
  const [count, setCount] = useState(0);
  const elementRef = useRef(null);
  const valueRef = useRef({ val: 0 });

  useEffect(() => {
    const el = elementRef.current;
    
    if (!el) return;

    // Reset value specific to this instance
    valueRef.current.val = 0;

    const ctx = gsap.context(() => {
      gsap.to(valueRef.current, {
        val: end,
        duration: duration,
        scrollTrigger: {
          trigger: el,
          start: "top 85%", // Start animation when 85% of viewport is reached
          toggleActions: "play none none reverse", // Replay on scroll back up? Or just "play none none none" for once? "play none none reverse" makes it re-animate if you scroll up and down. Let's stick to simple "play none none none" for now, or "restart none none none". Let's try standard play.
        },
        onUpdate: () => {
          setCount(valueRef.current.val);
        },
        ease: "power1.out",
      });
    }, el);

    return () => ctx.revert();
  }, [end, duration]);

  // Format the number
  const formattedCount = count.toFixed(decimals);

  return (
    <span ref={elementRef}>
      {parseFloat(formattedCount) + suffix}
    </span>
  );
}
