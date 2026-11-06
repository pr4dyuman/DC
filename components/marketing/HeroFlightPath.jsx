// Homepage hero background: a still grid and one hand-drawn flight path that
// draws itself once when the page loads. The styles and the draw animation are
// in app/globals.css (.dc-hero-grid, .dc-flight-path); with reduced motion the
// path is shown already drawn.
export default function HeroFlightPath() {
  return (
    <div aria-hidden="true" className="dc-hero-grid pointer-events-none absolute inset-0">
      <svg
        className="dc-flight-path-svg"
        viewBox="0 0 1344 200"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          className="dc-flight-path"
          pathLength="1"
          d="M -20 110 C 160 84, 340 128, 540 100 S 860 60, 1000 84 C 1077 97, 1140 56, 1130 30 C 1120 6, 1060 6, 1060 40 C 1060 76, 1130 94, 1200 76 S 1320 40, 1370 30"
          stroke="#F5EE30"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
