import { CheckCheck } from "lucide-react";

import InsightPanel from "./InsightPanel";

// A direct-message inbox with reply times, and the monthly totals under it.
export default function InsightMessageInbox({ insight, sample }) {
  return (
    <InsightPanel title={insight.title} note={insight.note} sample={sample}>
      <div className="flex-1 overflow-hidden rounded-2xl bg-white text-[#111] shadow-[0_30px_70px_-45px_rgba(245,238,48,0.6)]">
        <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
          <p className="text-sm font-bold">Messages</p>
          <p className="text-[11px] font-bold text-black/45">Saturday</p>
        </div>
        <div className="flex gap-5 border-b border-black/10 px-4 text-xs font-bold text-black/45" aria-hidden="true">
          <span className="border-b-2 border-black pb-2 text-black">Primary</span>
          <span className="pb-2">General</span>
          <span className="pb-2">Requests</span>
        </div>
        <ul className="divide-y divide-black/[0.06]">
          {insight.messages.map((message) => (
            <li key={message.from + message.time} className="flex gap-3 px-4 py-3">
              <span className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px]" aria-hidden="true">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-sm font-bold text-black">
                  {message.from.charAt(0)}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-bold">{message.from}</p>
                  <p className="shrink-0 text-[11px] text-black/45">{message.time}</p>
                </div>
                <p className="mt-0.5 text-[13px] leading-5 text-black/70">{message.text}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[#0a8f5a]">
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {message.reply}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
        {insight.summary.map((item) => (
          <div key={item.label} className="flex flex-col-reverse bg-black p-4">
            <dt className="mt-1 text-xs text-white/55">{item.label}</dt>
            <dd className="text-2xl font-bold tabular-nums text-white">{item.value}</dd>
          </div>
        ))}
      </dl>
    </InsightPanel>
  );
}
