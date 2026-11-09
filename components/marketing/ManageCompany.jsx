import Link from "next/link";
import { ArrowRight, CircleCheck, Sparkle, Undo2 } from "lucide-react";

const portalTasks = [
    { title: "Shot list", status: "Done" },
    { title: "Location booking", status: "Done" },
    { title: "Food styling", status: "Done" },
    { title: "Edit and retouch", status: "In Progress" },
    { title: "Final delivery", status: "Todo" },
];

const statusChipClassName = {
    Done: "bg-[#12291a] text-[#4ade80]",
    "In Progress": "bg-[#2a2405] text-[#ffd60a]",
    Todo: "bg-[#1c1c1c] text-[#d4d4d8]",
};

const taskEstimates = [
    { title: "Copy", hours: "5h" },
    { title: "Design", hours: "7h" },
    { title: "Build", hours: "6h" },
    { title: "QA", hours: "2h" },
    { title: "Launch", hours: "2h" },
];

// Shown under the section on the Agency OS page only.
const agencyOsFeatures = [
    {
        title: "Projects",
        description: "Kanban boards with assignees, priorities, estimates and due dates for every client project.",
    },
    {
        title: "Singularity AI",
        description: "Ask it to break down work, estimate hours or create invoices. Every change it makes can be undone.",
    },
    {
        title: "Finance",
        description: "Income, expenses, invoices and payroll in one place, with CSV exports for your accountant.",
    },
    {
        title: "Team and clients",
        description: "Workloads and leave requests for your team, and a portal for each client.",
    },
];

const chipClassName = "rounded-full px-2.5 py-[3px] text-[11px] font-semibold";

const handArrowPaths = {
    left: ["M114 10 C 86 4, 52 10, 14 36", "M14 36 L 31 34", "M14 36 L 21 21"],
    leftLow: ["M114 8 C 92 20, 58 34, 14 38", "M14 38 L 28 30", "M14 38 L 29 44"],
    right: ["M6 10 C 34 4, 68 10, 106 36", "M106 36 L 89 34", "M106 36 L 99 21"],
    up: ["M30 60 C 22 44, 16 26, 20 6", "M20 6 L 11 18", "M20 6 L 30 16"],
    down: ["M18 4 C 26 20, 32 38, 28 58", "M28 58 L 19 47", "M28 58 L 37 48"],
};

// Hand-drawn arrows next to the notes: sideways beside the panels on wide
// screens, up or down at the panels above and below when they stack.
function HandArrow({ direction, className = "" }) {
    const vertical = direction === "up" || direction === "down";

    return (
        <svg
            aria-hidden="true"
            width={vertical ? 40 : 110}
            height={vertical ? 54 : 44}
            viewBox={vertical ? "0 0 48 64" : "0 0 120 48"}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {handArrowPaths[direction].map((d) => (
                <path key={d} d={d} />
            ))}
        </svg>
    );
}

// Also used on the homepage, where it shows clients their own portal.
export function ClientPortalPreview() {
    return (
        <figure className="m-0 w-full min-w-0 max-w-[640px] xl:max-w-none">
            <figcaption className="sr-only">
                Example of the Agency OS client portal: a client sees their project with 3 of 5 tasks done and an
                invoice of 48,000 rupees waiting for payment.
            </figcaption>
            <div aria-hidden="true" className="flex flex-col gap-4 rounded-2xl bg-[#0a0a0a] p-5 font-sans text-[#fafafa]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs text-[#a1a1aa]">Café Rasa · Client portal</span>
                        <span className="text-xl font-semibold tracking-[-0.01em]">Menu shoot</span>
                    </div>
                    <span className={`${chipClassName} bg-[#12291a] text-[#4ade80]`}>Active</span>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between gap-3 text-xs text-[#d4d4d8]">
                        <span>3 of 5 tasks done</span>
                        <span className="font-mono">60%</span>
                    </div>
                    <div className="flex h-1.5 rounded-full bg-[#27272a]">
                        <div className="w-3/5 rounded-full bg-[#F5EE30]" />
                    </div>
                </div>
                <ul className="m-0 flex list-none flex-col border-t border-[#1f1f1f] p-0">
                    {portalTasks.map((task) => (
                        <li
                            key={task.title}
                            className="flex items-center justify-between gap-3 border-b border-[#1f1f1f] py-[9px] text-sm"
                        >
                            <span>{task.title}</span>
                            <span className={`${chipClassName} ${statusChipClassName[task.status]}`}>{task.status}</span>
                        </li>
                    ))}
                </ul>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#262626] bg-[#141414] py-2.5 pl-3.5 pr-2.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono text-xs text-[#a1a1aa]">INV-0042</span>
                        <span className="text-base font-semibold">₹48,000</span>
                        <span className={`${chipClassName} bg-[#1c1c1c] text-[#d4d4d8]`}>Pending</span>
                    </div>
                    <span className="inline-flex min-h-[44px] items-center rounded-lg bg-[#F5EE30] px-4 text-[13px] font-semibold text-[#0a0a0a]">
                        Submit Payment
                    </span>
                </div>
            </div>
        </figure>
    );
}

function SingularityPreview() {
    return (
        <figure className="m-0 w-full min-w-0 max-w-[640px] xl:max-w-none">
            <figcaption className="sr-only">
                Example of the Singularity AI assistant: asked to turn a landing page brief into tasks, it creates 5
                tasks estimated at 22 hours, with a button to undo those actions.
            </figcaption>
            <div aria-hidden="true" className="flex flex-col gap-3 rounded-2xl bg-[#0a0a0a] p-[18px] font-sans text-[#fafafa]">
                <div className="flex items-center gap-2 text-xs text-[#a1a1aa]">
                    <Sparkle className="h-3.5 w-3.5 fill-[#F5EE30] text-[#F5EE30]" />
                    <span className="font-semibold text-[#fafafa]">Singularity</span>
                    <span>Agent mode</span>
                </div>
                <p className="m-0 max-w-[90%] self-end rounded-xl rounded-br-[4px] bg-[#1c1c1c] px-3 py-2.5 text-[13px] leading-[1.45]">
                    Turn the spa landing page brief into tasks and estimate it.
                </p>
                <p className="m-0 text-[13px] leading-[1.45]">Created 5 tasks in Spa landing page, 22 hours in total.</p>
                <div className="flex flex-wrap gap-1.5">
                    {taskEstimates.map((task) => (
                        <span key={task.title} className="rounded-full bg-[#1c1c1c] px-2.5 py-[5px] text-xs text-[#e4e4e7]">
                            {task.title} <span className="font-mono text-[#a1a1aa]">{task.hours}</span>
                        </span>
                    ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[#232323] bg-[#111111] py-1.5 pl-3 pr-1.5">
                    <span className="flex items-center gap-2 text-xs text-[#d4d4d8]">
                        <CircleCheck className="h-[15px] w-[15px] text-[#4ade80]" />
                        5 tasks created
                    </span>
                    <span className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#2e2e2e] px-3 text-xs font-medium">
                        <Undo2 className="h-3.5 w-3.5" />
                        Undo these actions
                    </span>
                </div>
            </div>
        </figure>
    );
}

function HandNotes() {
    return (
        <div className="flex flex-col gap-7 font-architects text-lg leading-snug sm:text-xl">
            <div className="flex flex-col gap-1">
                <HandArrow direction="up" className="xl:hidden" />
                <HandArrow direction="left" className="hidden xl:block" />
                <p className="m-0">this is all your client sees. their project, their files, their invoices.</p>
            </div>
            <div className="flex flex-col gap-1">
                <HandArrow direction="up" className="xl:hidden" />
                <HandArrow direction="leftLow" className="hidden xl:block" />
                <p className="m-0">they pay here. you see it as Processing and mark it Paid.</p>
            </div>
            <div className="flex flex-col gap-1 xl:items-end xl:text-right">
                <p className="m-0">the AI wrote these tasks. one click undoes all of it.</p>
                <HandArrow direction="down" className="xl:hidden" />
                <HandArrow direction="right" className="hidden xl:block" />
            </div>
        </div>
    );
}

export default function ManageCompanySection({
    headingLevel = "h2",
    eyebrow = "for agencies tired of chasing updates",
    showServiceLink = true,
    showFeatures = false,
}) {
    const HeadingTag = headingLevel === "h1" ? "h1" : "h2";
    const FeatureHeadingTag = HeadingTag === "h1" ? "h2" : "h3";
    const eyebrowClassName = "block font-architects text-lg font-normal leading-snug sm:text-[22px]";

    return (
        <section
            aria-labelledby="agency-os-heading"
            className="bg-black px-[var(--site-gutter)] py-12 font-glacial sm:py-16 lg:py-20"
        >
            <div className="mx-auto max-w-[var(--site-content)] bg-[#F5EE30] px-5 py-10 text-[#0b0b0b] sm:p-12 lg:p-[72px]">
                <div className="mx-auto flex max-w-[1200px] flex-col gap-10 lg:gap-12">
                    <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:gap-16">
                        <div className="flex flex-col gap-3.5 lg:flex-[1_1_560px]">
                            {HeadingTag === "h2" ? <span className={eyebrowClassName}>{eyebrow}</span> : null}
                            <HeadingTag
                                id="agency-os-heading"
                                className="m-0 font-glacial-bold text-[clamp(2.5rem,5.6vw,5.25rem)] uppercase leading-[0.92] tracking-[-0.01em] text-balance"
                            >
                                {HeadingTag === "h1" ? (
                                    <span className={`${eyebrowClassName} mb-3.5 normal-case tracking-normal`}>{eyebrow}</span>
                                ) : null}
                                Fewer “any update?” messages.
                            </HeadingTag>
                            <svg
                                aria-hidden="true"
                                width="240"
                                height="18"
                                viewBox="0 0 260 18"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-auto w-48 sm:w-60"
                            >
                                <path d="M4 12 C 40 4, 70 15, 104 9 S 170 4, 200 10 S 240 14, 256 6" />
                            </svg>
                        </div>

                        <div className="flex flex-col gap-5 lg:max-w-[400px] lg:flex-[1_1_300px]">
                            <p className="m-0 text-base leading-relaxed text-pretty sm:text-lg">
                                Agency OS gives every client a login to follow their project and pay invoices. You get one
                                place for tasks, money and your team.
                            </p>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                                <Link
                                    href="/get-started"
                                    prefetch={false}
                                    className="group inline-flex min-h-[52px] items-center gap-2.5 rounded-full bg-[#0b0b0b] px-6 font-glacial-bold text-[15px] uppercase tracking-[0.04em] text-[#F5EE30] transition-colors hover:bg-[#262626] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b0b0b]"
                                >
                                    Start 7-day free trial
                                    <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </Link>
                                {showServiceLink ? (
                                    <Link
                                        href="/agency-os"
                                        prefetch={false}
                                        className="inline-flex min-h-[44px] items-center font-glacial-bold text-base underline decoration-2 underline-offset-[6px] hover:decoration-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0b0b0b]"
                                    >
                                        How Agency OS works
                                    </Link>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(200px,0.65fr)_minmax(0,1fr)] xl:items-center">
                        <ClientPortalPreview />
                        <HandNotes />
                        <SingularityPreview />
                    </div>

                    <p className="m-0 font-architects text-lg leading-snug sm:text-xl">
                        made by Digital Corvids, a digital agency in Jaipur.
                    </p>
                </div>
            </div>

            {showFeatures ? (
                <ul className="mx-auto mb-0 mt-14 grid max-w-[var(--site-content)] list-none gap-8 border-t border-white/15 p-0 pt-8 text-white sm:grid-cols-2 lg:grid-cols-4">
                    {agencyOsFeatures.map((feature, index) => (
                        <li key={feature.title} className="flex flex-col gap-2.5">
                            <span aria-hidden="true" className="font-etna text-xl text-[#F5EE30]">
                                .0{index + 1}
                            </span>
                            <FeatureHeadingTag className="m-0 font-glacial-bold text-xl">{feature.title}</FeatureHeadingTag>
                            <p className="m-0 text-base leading-relaxed text-gray-400">{feature.description}</p>
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
