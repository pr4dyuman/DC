"use client";

import { Children, useSyncExternalStore } from "react";

const FILTER_EVENT = "portfolio:filter";

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

// Service filters over server-rendered case cards. The choice lives in the URL
// (?service=seo), so service pages and shared links open a filtered view.
export default function PortfolioWorkGrid({ filters, items, children }) {
  const requested = useSyncExternalStore(subscribe, getRequestedFilter, getServerFilter);
  const active = filters.some((filter) => filter.id === requested) ? requested : "all";
  const cards = Children.toArray(children);
  const visible = items.map((item) => active === "all" || item.services.includes(active));
  const fullWidth = getFullWidth(items, visible);
  const shown = visible.filter(Boolean).length;
  const options = [{ id: "all", label: "All work", count: items.length }, ...filters];

  const choose = (id) => {
    const url = new URL(window.location.href);
    if (id === "all") {
      url.searchParams.delete("service");
    } else {
      url.searchParams.set("service", id);
    }
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(FILTER_EVENT));
  };

  return (
    <div>
      {filters.length > 1 ? (
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
          role="group"
          aria-label="Filter work by service"
        >
          {options.map((option) => {
            const isActive = option.id === active;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => choose(option.id)}
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
      ) : null}

      <p className="sr-only" aria-live="polite">
        {shown} {shown === 1 ? "project" : "projects"} shown
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
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
