"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function StreakCalendar({ userId }) {
  const [activityData, setActivityData] = useState({});
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const daysPerWeek = 7;

  // Calculate start date (1 year ago from today)
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  oneYearAgo.setDate(today.getDate() + 1); // Start from tomorrow last year

  // Find the Sunday before or on the start date
  const startDate = new Date(oneYearAgo);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Calculate total days and weeks
  const daysDiff = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24));
  const weeks = Math.ceil(daysDiff / 7);

  useEffect(() => {
    if (userId) {
      fetchActivityData();

      // Refresh activity calendar every 15 seconds for real-time updates
      const interval = setInterval(fetchActivityData, 15000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const fetchActivityData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gamification/activity");
      if (res.ok) {
        const data = await res.json();
        setActivityData(data.activities || {});
      }
    } catch (error) {
      console.error("Failed to fetch activity data:", error);
    }
    setLoading(false);
  };

  const getIntensityColor = (count) => {
    if (count === 0) return "bg-slate-100 dark:bg-slate-800";
    if (count === 1) return "bg-green-200 dark:bg-green-900";
    if (count === 2) return "bg-green-300 dark:bg-green-700";
    if (count === 3) return "bg-green-400 dark:bg-green-600";
    return "bg-green-500 dark:bg-green-500";
  };

  const getDayLabel = (dayIndex) => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return days[dayIndex];
  };

  // Calculate total activities
  const totalActivities = Object.values(activityData).reduce((sum, count) => sum + count, 0);
  const activeDays = Object.values(activityData).filter(count => count > 0).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1">
            <Calendar className="h-3 w-3 text-green-500" />
            {totalActivities} activities in the last year
          </CardTitle>
          <div className="text-[9px] text-muted-foreground">
            {activeDays} active days
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-1 mt-2">
            <div className="min-w-175 flex flex-col gap-1">
              {/* Month labels */}
              <div className="flex gap-0.5">
                <div className="w-4"></div>
                <div className="flex gap-0.5">
                  {Array.from({ length: weeks }).map((_, weekIndex) => {
                    const weekStart = new Date(startDate);
                    weekStart.setDate(weekStart.getDate() + (weekIndex * 7));

                    const prevWeekStart = new Date(weekStart);
                    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

                    // Show month label if this week is in a different month than previous week
                    const showLabel = weekIndex === 0 || weekStart.getMonth() !== prevWeekStart.getMonth();
                    const monthLabel = showLabel ? weekStart.toLocaleDateString('en-US', { month: 'short' }) : '';

                    return (
                      <div
                        key={weekIndex}
                        className="text-[9px] text-muted-foreground w-2.5"
                      >
                        {monthLabel}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-0.5">
                {/* Day labels */}
                <div className="flex flex-col gap-0.5">
                  {Array.from({ length: daysPerWeek }).map((_, dayIndex) => (
                    <div key={dayIndex} className="w-4 h-2.5 flex items-center">
                      <span className="text-[8px] text-muted-foreground">
                        {dayIndex % 2 === 1 ? getDayLabel(dayIndex) : ''}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Weeks grid */}
                <div className="flex gap-0.5">
                  {Array.from({ length: weeks }).map((_, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-0.5">
                      {Array.from({ length: daysPerWeek }).map((_, dayIndex) => {
                        const date = new Date(startDate);
                        date.setDate(date.getDate() + (weekIndex * 7) + dayIndex);

                        // Only show if date is within the year range and not in the future
                        const isInRange = date >= oneYearAgo && date <= today;
                        const dateStr = date.toISOString().split('T')[0];
                        const count = isInRange ? (activityData[dateStr] || 0) : 0;

                        return (
                          <div
                            key={dayIndex}
                            className={`w-2.5 h-2.5 rounded-sm ${isInRange
                              ? getIntensityColor(count)
                              : 'bg-transparent'
                              } transition-all hover:ring-1 hover:ring-blue-400 cursor-pointer`}
                            title={isInRange ? `${dateStr}: ${count} activities` : ''}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-end gap-1 pt-1 text-[8px] text-muted-foreground">
                <span>Less</span>
                <div className="flex gap-0.5">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`w-2.5 h-2.5 rounded-sm ${getIntensityColor(level)}`}
                    />
                  ))}
                </div>
                <span>More</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
