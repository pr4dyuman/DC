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

export function ContributionHeatmap({ data, className, leaveDates = [], tooltipLabel = "completed" }: ContributionHeatmapProps) {
    // 1. Generate Calendar Grid (Last 365 days / 52 weeks)
    const calendarData = useMemo(() => {
        const today = new Date();
        const endDate = today;
        const startDate = new Date(today);
        startDate.setFullYear(today.getFullYear() - 1);

        // Adjust start date to the previous Monday to align grid
        const dayOfWeek = startDate.getDay(); // 0 (Sun) - 6 (Sat)
        const daysToShift = (dayOfWeek + 6) % 7;
        startDate.setDate(startDate.getDate() - daysToShift);

        const dates: Date[] = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }, []);

    // Helper: Determine Color for a Day
    const getCellProps = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        const stats = data[dateStr];
        const count = stats?.count || 0;
        const isLeave = leaveDates.includes(dateStr);

        let colorClass = COLORS.empty;

        if (isLeave) colorClass = COLORS.leave;
        else if (count === 0) colorClass = COLORS.empty;
        else if (count === 1) colorClass = COLORS.level1;
        else if (count === 2) colorClass = COLORS.level2;
        else if (count === 3) colorClass = COLORS.level3;
        else colorClass = COLORS.level4; // 4+

        return { colorClass, count, dateStr, isLeave };
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

        if (currentWeek.length > 0) {
            weeksArray.push(currentWeek);
        }

        return weeksArray;
    }, [calendarData]);

    const months = useMemo(() => {
        const monthLabels: { label: string, index: number }[] = [];
        weeks.forEach((week, index) => {
            const firstDay = week[0];
            if (index === 0) {
                monthLabels.push({ label: firstDay.toLocaleString('default', { month: 'short' }), index });
            } else {
                const prevWeekFirstDay = weeks[index - 1][0];
                if (firstDay.getMonth() !== prevWeekFirstDay.getMonth()) {
                    monthLabels.push({ label: firstDay.toLocaleString('default', { month: 'short' }), index });
                }
            }
        });
        return monthLabels;
    }, [weeks]);


    return (
        <div className={cn("w-full overflow-x-auto", className)}>
            <div className="min-w-[700px] flex flex-col gap-2">

                {/* Month Labels */}
                <div className="flex text-xs text-neutral-400 mb-1 relative h-6">
                    {months.map((m, i) => (
                        <span key={i} style={{ left: `${m.index * 14}px`, position: 'absolute' }}>{m.label}</span>
                    ))}
                </div>

                <div className="flex gap-[2px]">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-[2px]">
                            {week.map((day, dIndex) => {
                                const { colorClass, count, dateStr, isLeave } = getCellProps(day);
                                const niceDate = day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

                                return (
                                    <TooltipProvider key={dIndex}>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "w-3 h-3 rounded-[3px] transition-all hover:ring-1 hover:ring-white/20 hover:scale-110 z-0 hover:z-10 cursor-pointer",
                                                        colorClass
                                                    )}
                                                    aria-label={`${count} completed tasks on ${niceDate}`}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-neutral-900 border-neutral-800 text-white p-2 text-xs shadow-xl">
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
