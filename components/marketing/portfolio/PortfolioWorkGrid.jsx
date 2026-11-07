"use client";

import { Children, useSyncExternalStore } from "react";

const FILTER_EVENT = "portfolio:filter";
export const PORTFOLIO_GRID_ID = "work-grid";

function subscribe(callback) {
  window.addEventListener("popstate", callback);
  window.addEventListener(FILTER_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(FILTER_EVENT, callback);
  };
}

const getRequestedFilter = () => new URLSearchParams(window.location.search).get("service") || "all";
const getServerFilter = () => "all";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Brings the top of the grid into view below the sticky filter bar, but only
// when the visitor has scrolled past it.
function revealGrid(always = false) {
  requestAnimationFrame(() => {
    const grid = document.getElementById(PORTFOLIO_GRID_ID);
    const bar = document.querySelector("[data-portfolio-filter-bar]");
    if (!grid) return;

    const offset = (bar?.getBoundingClientRect().height || 0) + 24;
    const top = grid.getBoundingClientRect().top;
    if (always || top < offset) {
      window.scrollTo({ top: window.scrollY + top - offset, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  });
}

/**
 * Shows the work for one or more services (`"seo"`, `["web", "app"]`, or
 * `"all"`). The choice lives in the URL (?service=web,app), so service pages
 * and shared links open a filtered view.
 */
export function setPortfolioFilter(ids, { scroll = false } = {}) {
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  const url = new URL(window.location.href);
  if (!list.length || list.includes("all")) {
    url.searchParams.delete("service");
  } else {
    url.searchParams.set("service", list.join(","));
  }
  // Keep the comma readable in shared links: ?service=web,app
  url.search = url.searchParams.toString().replace(/%2C/gi, ",");
  url.hash = "";
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new Event(FILTER_EVENT));
  revealGrid(scroll);
}

// Featured items take a full row. Between them, a run with an odd number of
// cards gives its last card the full row too, so the grid never leaves a gap.
function getFullWidth(items, visible) {
  const fullWidth = items.map(() => false);
  let run = [];
  const closeRun = () => {
    if (run.length % 2 === 1) fullWidth[run[run.length - 1]] = true;
    run = [];
  };

  items.forEach((item, index) => {
    if (!visible[index]) return;
    if (item.featured) {
      closeRun();
      fullWidth[index] = true;
    } else {
      run.push(index);
    }
  });
  closeRun();

  return fullWidth;
}

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5EE30]";

// Service filters over server-rendered case cards. The filter bar sticks to
// the top of the screen while the grid scrolls past.
export default function PortfolioWorkGrid({ filters, items, children }) {
  const requested = useSyncExternalStore(subscribe, getRequestedFilter, getServerFilter);
  const known = new Set(filters.map((filter) => filter.id));
  const requestedIds = requested.split(",").filter((id) => known.has(id));
  const activeIds = requestedIds.length ? requestedIds : ["all"];
  const showAll = activeIds.includes("all");
  const cards = Children.toArray(children);
  const visible = items.map((item) => showAll || item.services.some((id) => activeIds.includes(id)));
  const fullWidth = getFullWidth(items, visible);
  const shown = visible.filter(Boolean).length;
  const options = [{ id: "all", label: "All work", count: items.length }, ...filters];
  const hasFilters = filters.length > 1;

  return (
    <div>
      {hasFilters ? (
        <div
          data-portfolio-filter-bar
          className="sticky top-0 z-30 -mx-[var(--site-gutter)] border-b border-white/10 bg-black/90 px-[var(--site-gutter)] py-3 backdrop-blur-md sm:mx-0 sm:px-0"
        >
          <div className="flex items-center gap-4">
            <div
              className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
              role="group"
              aria-label="Filter work by service"
            >
              {options.map((option) => {
                const isActive = option.id === "all" ? showAll : activeIds.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setPortfolioFilter(option.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition-colors ${focusRing} ${
                      isActive
                        ? "border-[#F5EE30] bg-[#F5EE30] text-black"
                        : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                    }`}
                  >
                    {option.label}
                    <span className={`tabular-nums ${isActive ? "text-black/55" : "text-white/40"}`}>{option.count}</span>
                  </button>
                );
              })}
            </div>
            <p
              className="hidden shrink-0 text-xs font-bold uppercase tracking-[0.16em] text-white/45 md:block"
              aria-live="polite"
            >
              Showing <span className="tabular-nums text-white">{shown}</span> of{" "}
              <span className="tabular-nums">{items.length}</span>
            </p>
          </div>
        </div>
      ) : null}

      <p className="sr-only md:hidden" aria-live="polite">
        {shown} {shown === 1 ? "project" : "projects"} shown
      </p>

      <div id={PORTFOLIO_GRID_ID} className="mt-8 grid scroll-mt-24 grid-cols-1 gap-5 lg:grid-cols-2">
        {cards.map((card, index) => (
          <div
            key={items[index].slug}
            hidden={!visible[index]}
            className={fullWidth[index] ? "lg:col-span-2" : undefined}
          >
            {card}
          </div>
        ))}
      </div>
    </div>
  );
}
