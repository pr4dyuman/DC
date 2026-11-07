"use client";

import { setPortfolioFilter } from "./PortfolioWorkGrid";

// A link that filters the work grid on this page to some services and scrolls
// to it. Without JavaScript it is a plain link to the filtered view.
export default function PortfolioFilterLink({ serviceIds, className = "", children }) {
  const href = `?service=${serviceIds.join(",")}#work`;

  const onClick = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setPortfolioFilter(serviceIds, { scroll: true });
  };

  return (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
