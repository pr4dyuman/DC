"use client";

import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DailyStats = {
    date: string; // YYYY-MM-DD
    count: number;
};

interface ContributionHeatmapProps {
    data: Record<string, DailyStats>;
    leaveDates?: string[]; // Array of YYYY-MM-DD
    className?: string;
    tooltipLabel?: string;
}

const COLORS = {
    empty: "bg-neutral-950", // Dark Black/Empty
    level1: "bg-green-900",  // Dark Green (1 task)
    level2: "bg-green-700",  // Medium Green (2 tasks)
    level3: "bg-green-500",  // Light Green (3 tasks)
    level4: "bg-green-400",  // Bright Green (4+ tasks)
    leave: "bg-red-500",     // RED for Leave
};

export function ContributionHeatmap({ data, className, leaveDates = [], tooltipLabel = "completed", year = new Date().getFullYear() }: ContributionHeatmapProps & { year?: number }) {
    // 1. Generate Calendar Grid (Fixed Year)
    const calendarData = useMemo(() => {
        const dates: Date[] = [];
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        // Adjust to start of the week (Sunday)
        const dayOfWeek = startDate.getDay(); // 0 is Sun
        const startOffset = dayOfWeek; // Days to go back to reach Sunday
        const gridStartDate = new Date(startDate);
        gridStartDate.setDate(gridStartDate.getDate() - startOffset);

        // We need enough days to cover the whole year up to the last week
        // Loop until we reach a date > endDate AND it's the end of a week (Saturday)

        let currentDate = new Date(gridStartDate);

        // Safety break
        let count = 0;
        while (count < 400) { // 53 weeks * 7 = 371
            dates.push(new Date(currentDate));

            // Stop if we are past Dec 31 AND we just finished a week (current is Saturday)
            if (currentDate > endDate && currentDate.getDay() === 6) {
                break;
            }

            currentDate.setDate(currentDate.getDate() + 1);
            count++;
        }

        return dates;
    }, [year]);

    // Helper: Determine Color for a Day
    const getCellProps = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];

        // If date is outside the selected year, perform visual rendering but maybe dimmed or empty?
        // Typically Github shows them as empty or invisible.
        // Let's filter: if year matches, show data. Else empty.

        const isCurrentYear = date.getFullYear() === year;

        const stats = data[dateStr];
        const count = stats?.count || 0;
        const isLeave = leaveDates.includes(dateStr);

        let colorClass = COLORS.empty;

        if (isCurrentYear) {
            if (isLeave) colorClass = COLORS.leave;
            else if (count === 0) colorClass = COLORS.empty;
            else if (count === 1) colorClass = COLORS.level1;
            else if (count === 2) colorClass = COLORS.level2;
            else if (count === 3) colorClass = COLORS.level3;
            else colorClass = COLORS.level4; // 4+
        } else {
            // Days from prev/next year used for padding
            colorClass = "bg-transparent ring-0 hover:ring-0 cursor-default";
        }

        return { colorClass, count, dateStr, isLeave, isCurrentYear };
    };

    // Group by Weeks for Grid Layout (Columns = Weeks)
    const weeks = useMemo(() => {
        const weeksArray: Date[][] = [];
        let currentWeek: Date[] = [];

        calendarData.forEach((date) => {
            currentWeek.push(date);
            if (currentWeek.length === 7) {
                weeksArray.push(currentWeek);
                currentWeek = [];
            }
        });

        // Push remaining if any (shouldn't be based on logic above, but safety)
        if (currentWeek.length > 0) weeksArray.push(currentWeek);

        return weeksArray;
    }, [calendarData]);

    const months = useMemo(() => {
        const monthLabels: { label: string, index: number }[] = [];
        weeks.forEach((week, index) => {
            const firstDay = week[0];

            // Logic to place month label at the start of the month
            // If the week contains the 1st of a month, label it.
            const hasFirstOfMonth = week.some(d => d.getDate() === 1 && d.getFullYear() === year);

            if (hasFirstOfMonth) {
                const d = week.find(d => d.getDate() === 1)!;
                monthLabels.push({ label: d.toLocaleString('default', { month: 'short' }), index });
            }
        });
        return monthLabels;
    }, [weeks, year]);


    return (
        <div className={cn("w-full overflow-hidden", className)}> {/* Hid overflow to remove scroller */}
            <div className="flex flex-col gap-2"> {/* Removed min-w constraint */}

                {/* Month Labels */}
                <div className="flex text-xs text-neutral-400 mb-1 relative h-6 w-full">
                    {months.map((m, i) => (
                        <span key={i} style={{ left: `${(m.index / weeks.length) * 100}%`, position: 'absolute' }}>{m.label}</span>
                    ))}
                </div>

                <div className="flex justify-between w-full h-full gap-1 sm:gap-1">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1 sm:gap-1 flex-1 min-w-0">
                            {week.map((day, dIndex) => {
                                const { colorClass, count, dateStr, isLeave, isCurrentYear } = getCellProps(day);
                                const niceDate = day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

                                if (!isCurrentYear) {
                                    // Render invisible placeholder - scale with flex
                                    return <div key={dIndex} className="w-full aspect-square" />
                                }

                                return (
                                    <TooltipProvider key={dIndex}>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "w-full aspect-square rounded-[1px] sm:rounded-[2px] transition-all hover:ring-1 hover:ring-white/50 z-0 hover:z-10 cursor-pointer", // Fluid sizing
                                                        colorClass
                                                    )}
                                                    aria-label={`${count} completed tasks on ${niceDate}`}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-neutral-900 border-neutral-800 text-white p-2 text-xs shadow-xl z-50">
                                                <p className="font-semibold mb-1">{niceDate}</p>
                                                <p className="text-neutral-300">
                                                    {isLeave ? "On Leave" : (count === 0 ? `No tasks ${tooltipLabel}` : `${count} task${count === 1 ? '' : 's'} ${tooltipLabel}`)}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-end text-[10px] text-neutral-500 mt-2 gap-2">
                    <span>Less</span>
                    <div className="flex gap-[2px]">
                        <div className="w-3 h-3 rounded-[2px] bg-neutral-950" title="0 tasks"></div>
                        <div className="w-3 h-3 rounded-[2px] bg-green-900" title="1 task"></div>
                        <div className="w-3 h-3 rounded-[2px] bg-green-700" title="2 tasks"></div>
                        <div className="w-3 h-3 rounded-[2px] bg-green-500" title="3 tasks"></div>
                        <div className="w-3 h-3 rounded-[2px] bg-green-400" title="4+ tasks"></div>
                    </div>
                    <span>More</span>
                </div>
            </div>

            {/* Contribution Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-neutral-800 pt-6">
                {(() => {
                    // Calculate Stats
                    const values = Object.values(data);
                    const totalTasks = values.reduce((acc, curr) => acc + curr.count, 0);
                    const activeDays = values.filter(d => d.count > 0).length;

                    // Streaks
                    let maxStreak = 0;
                    let currentStreak = 0;
                    let tempStreak = 0;

                    // Sort dates to ensure streak calculation is correct
                    const sortedDates = Object.keys(data).sort();
                    const todayStr = new Date().toISOString().split('T')[0];

                    sortedDates.forEach((dateStr) => {
                        if (data[dateStr].count > 0) {
                            tempStreak++;
                            maxStreak = Math.max(maxStreak, tempStreak);
                        } else {
                            tempStreak = 0;
                        }
                    });

                    // Check current streak (working backwards from today)
                    // Simple check: if today has data, start count, else 0 (or check yesterday if today is empty?)
                    // For simplicity, we check contiguous active days ending today or yesterday.
                    let checkDate = new Date();
                    while (true) {
                        const dStr = checkDate.toISOString().split('T')[0];
                        if (data[dStr] && data[dStr].count > 0) {
                            currentStreak++;
                            checkDate.setDate(checkDate.getDate() - 1);
                        } else {
                            // If today is empty, maybe they haven't worked YET today. Check yesterday.
                            const isToday = dStr === new Date().toISOString().split('T')[0];
                            if (isToday && currentStreak === 0) {
                                checkDate.setDate(checkDate.getDate() - 1);
                                continue;
                            }
                            break;
                        }
                    }

                    return (
                        <>
                            <div className="flex flex-col">
                                <span className="text-xs text-neutral-500">Total Completed</span>
                                <span className="text-base font-bold text-white">{totalTasks}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-neutral-500">Max Streak</span>
                                <span className="text-base font-bold text-white">{maxStreak} Days</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-neutral-500">Current Streak</span>
                                <span className="text-base font-bold text-white">{currentStreak} Days</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs text-neutral-500">Active Days</span>
                                <span className="text-base font-bold text-white">{activeDays}</span>
                            </div>
                        </>
                    );
                })()}
            </div>
        </div>
    );
}
