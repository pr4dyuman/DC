"use client";

import React, { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDateFormat } from "@/context/TimezoneContext";

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
    empty: "bg-muted", // Empty
    level1: "bg-green-900",  // Dark Green (1 task)
    level2: "bg-green-700",  // Medium Green (2 tasks)
    level3: "bg-green-500",  // Light Green (3 tasks)
    level4: "bg-green-400",  // Bright Green (4+ tasks)
    leave: "bg-red-500",     // RED for Leave
};

export function ContributionHeatmap({ data, className, leaveDates = [], tooltipLabel = "completed", year = new Date().getFullYear() }: ContributionHeatmapProps & { year?: number }) {
    const fmt = useDateFormat();

    // 1. Generate Calendar Grid (Fixed Year)
    const calendarData = useMemo(() => {
        const dates: Date[] = [];
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        // Adjust to start of the week (Sunday)
        const dayOfWeek = startDate.getDay();
        const gridStartDate = new Date(startDate);
        gridStartDate.setDate(gridStartDate.getDate() - dayOfWeek);

        const currentDate = new Date(gridStartDate);
        let count = 0;
        while (count < 400) {
            dates.push(new Date(currentDate));
            if (currentDate > endDate && currentDate.getDay() === 6) break;
            currentDate.setDate(currentDate.getDate() + 1);
            count++;
        }

        return dates;
    }, [year]);

    // Helper: Determine Color for a Day
    const getCellProps = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
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
            else colorClass = COLORS.level4;
        } else {
            colorClass = "bg-transparent ring-0 hover:ring-0 cursor-default";
        }

        return { colorClass, count, dateStr, isLeave, isCurrentYear };
    };

    // Group by Weeks
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

        if (currentWeek.length > 0) weeksArray.push(currentWeek);
        return weeksArray;
    }, [calendarData]);

    const months = useMemo(() => {
        const monthLabels: { label: string, index: number }[] = [];
        weeks.forEach((week, index) => {
            const hasFirstOfMonth = week.some(d => d.getDate() === 1 && d.getFullYear() === year);
            if (hasFirstOfMonth) {
                const d = week.find(d => d.getDate() === 1)!;
                monthLabels.push({ label: fmt.monthShort(d), index });
            }
        });
        return monthLabels;
    }, [weeks, year, fmt]);

    // Stats computed for the selected year only
    const yearStats = useMemo(() => {
        const yearPrefix = `${year}-`;
        const yearEntries = Object.entries(data).filter(([d]) => d.startsWith(yearPrefix));
        const totalTasks = yearEntries.reduce((acc, [, v]) => acc + v.count, 0);
        const activeDays = yearEntries.filter(([, v]) => v.count > 0).length;

        // Max streak within selected year
        let maxStreak = 0;
        let tempStreak = 0;
        const sortedDates = yearEntries.map(([d]) => d).sort();
        sortedDates.forEach((dateStr) => {
            if (data[dateStr]?.count > 0) {
                tempStreak++;
                maxStreak = Math.max(maxStreak, tempStreak);
            } else {
                tempStreak = 0;
            }
        });

        // Current streak: only meaningful for current year
        let currentStreak = 0;
        const currentYear = new Date().getFullYear();
        if (year === currentYear) {
            const checkDate = new Date();
            let safetyBreak = 0;
            while (safetyBreak < 400) {
                safetyBreak++;
                const dStr = checkDate.toISOString().split('T')[0];
                if (data[dStr] && data[dStr].count > 0) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    const isToday = dStr === new Date().toISOString().split('T')[0];
                    if (isToday && currentStreak === 0) {
                        checkDate.setDate(checkDate.getDate() - 1);
                        continue;
                    }
                    break;
                }
            }
        }

        return { totalTasks, activeDays, maxStreak, currentStreak };
    }, [data, year]);

    return (
        <div className={cn("w-full overflow-hidden", className)}>
            <div className="flex flex-col gap-2">

                {/* Month Labels */}
                <div className="flex text-xs text-muted-foreground mb-1 relative h-6 w-full">
                    {months.map((m, i) => (
                        <span key={i} style={{ left: `${(m.index / weeks.length) * 100}%`, position: 'absolute' }}>{m.label}</span>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex justify-between w-full h-full gap-1 sm:gap-1">
                    {weeks.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1 sm:gap-1 flex-1 min-w-0">
                            {week.map((day, dIndex) => {
                                const { colorClass, count, isLeave, isCurrentYear } = getCellProps(day);
                                const niceDate = fmt.dateWithDay(day);

                                if (!isCurrentYear) {
                                    return <div key={dIndex} className="w-full aspect-square" />;
                                }

                                return (
                                    <TooltipProvider key={dIndex}>
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <div
                                                    className={cn(
                                                        "w-full aspect-square rounded-[1px] sm:rounded-[2px] transition-all hover:ring-1 hover:ring-white/50 z-0 hover:z-10 cursor-pointer",
                                                        colorClass
                                                    )}
                                                    aria-label={`${count} completed tasks on ${niceDate}`}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-card border-border text-foreground p-2 text-xs shadow-xl z-50">
                                                <p className="font-semibold mb-1">{niceDate}</p>
                                                <p className="text-muted-foreground">
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

                {/* Legend */}
                <div className="flex items-center justify-end text-[10px] text-muted-foreground mt-2 gap-2">
                    <span>Less</span>
                    <div className="flex gap-[2px]">
                        <div className="w-3 h-3 rounded-[2px] bg-muted" title="0 tasks"></div>
                        <div className="w-3 h-3 rounded-[2px] bg-green-900" title="1 task"></div>
                        <div className="w-3 h-3 rounded-[2px] bg-green-700" title="2 tasks"></div>
                        <div className="w-3 h-3 rounded-[2px] bg-green-500" title="3 tasks"></div>
                        <div className="w-3 h-3 rounded-[2px] bg-green-400" title="4+ tasks"></div>
                    </div>
                    <span>More</span>
                </div>
            </div>

            {/* Stats Row — scoped to selected year */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-border pt-6">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Completed in {year}</span>
                    <span className="text-base font-bold text-foreground">{yearStats.totalTasks}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Max Streak</span>
                    <span className="text-base font-bold text-foreground">{yearStats.maxStreak} Days</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Current Streak</span>
                    <span className="text-base font-bold text-foreground">
                        {year === new Date().getFullYear() ? `${yearStats.currentStreak} Days` : "—"}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Active Days</span>
                    <span className="text-base font-bold text-foreground">{yearStats.activeDays}</span>
                </div>
            </div>
        </div>
    );
}
