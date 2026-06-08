"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Clock, BookOpen, Flame, Trophy, TrendingUp,
  Calendar, Target, Zap, Award
} from "lucide-react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function StatsCard({ userId }) {
  const [stats, setStats] = useState({
    totalXP: 0,
    level: 1,
    streak: 0,
    coursesCompleted: 0,
    chaptersCompleted: 0,
    quizzesPassed: 0,
    hoursStudied: 0,
    activityData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId]);

  const fetchStats = async () => {
    try {
      // Fetch gamification stats
      const statsRes = await fetch("/api/gamification/stats");
      const statsData = await statsRes.json();

      // Fetch roadmaps for course completion data
      const roadmapsRes = await fetch("/api/roadmap/all");
      const roadmapsData = await roadmapsRes.json();

      const completedCourses = roadmapsData.docs?.filter(r => r.completed)?.length || 0;
      const totalChapters = roadmapsData.docs?.reduce((acc, r) => {
        return acc + (r.chapters?.filter(c => c.completed)?.length || 0);
      }, 0) || 0;

      // Calculate hours studied (estimate: 1 XP ≈ 0.5 minutes of study)
      const hoursStudied = Math.round((statsData.xp || 0) * 0.5 / 60 * 10) / 10;

      // Generate activity data for heatmap (last 365 days)
      const activityData = generateActivityData(statsData.achievements || []);

      // Count quizzes passed
      const quizzesPassed = (statsData.achievements || []).filter(
        a => a.title === "Perfect Score!" || a.title === "Correct Answer!"
      ).length;

      setStats({
        totalXP: statsData.xp || 0,
        level: statsData.level || 1,
        streak: statsData.streak || 0,
        coursesCompleted: completedCourses,
        chaptersCompleted: totalChapters,
        quizzesPassed,
        hoursStudied,
        activityData,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Generate activity data from achievements
  const generateActivityData = (achievements) => {
    const activityMap = {};
    const today = new Date();

    // Initialize last 365 days with 0
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      activityMap[dateStr] = 0;
    }

    // Count activities per day
    achievements.forEach(achievement => {
      if (achievement.timestamp) {
        const dateStr = achievement.timestamp.split("T")[0];
        if (activityMap[dateStr] !== undefined) {
          activityMap[dateStr]++;
        }
      }
    });

    return Object.entries(activityMap).map(([date, count]) => ({
      date,
      count,
    }));
  };

  const getColorClass = (value) => {
    if (!value || value.count === 0) return "color-empty";
    if (value.count < 3) return "color-scale-1";
    if (value.count < 6) return "color-scale-2";
    if (value.count < 10) return "color-scale-3";
    return "color-scale-4";
  };

  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  if (loading) {
    return (
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Learning Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Learning Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatItem
            icon={Clock}
            label="Hours Studied"
            value={stats.hoursStudied}
            suffix="hrs"
            color="blue"
          />
          <StatItem
            icon={BookOpen}
            label="Courses Done"
            value={stats.coursesCompleted}
            color="green"
          />
          <StatItem
            icon={Flame}
            label="Day Streak"
            value={stats.streak}
            suffix="days"
            color="orange"
          />
          <StatItem
            icon={Zap}
            label="Total XP"
            value={stats.totalXP.toLocaleString()}
            color="purple"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{stats.level}</p>
            <p className="text-xs text-muted-foreground">Level</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{stats.chaptersCompleted}</p>
            <p className="text-xs text-muted-foreground">Chapters</p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-2xl font-bold">{stats.quizzesPassed}</p>
            <p className="text-xs text-muted-foreground">Quizzes</p>
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="space-y-2 min-w-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Activity Heatmap
            </h4>
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <span>Less</span>
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900" />
                <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-700" />
                <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500" />
                <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-400" />
              </div>
              <span>More</span>
            </div>
          </div>

          <div className="heatmap-container w-full max-w-full overflow-x-auto overflow-y-hidden pb-1">
            <CalendarHeatmap
              startDate={startDate}
              endDate={new Date()}
              values={stats.activityData}
              classForValue={getColorClass}
              showWeekdayLabels
              titleForValue={(value) => {
                if (!value || !value.date) return "No activity";
                return `${value.count} activities on ${value.date}`;
              }}
            />
          </div>
        </div>
      </CardContent>

      <style jsx global>{`
        .heatmap-container .react-calendar-heatmap {
          font-size: 10px;
          width: 100%;
          min-width: 720px;
        }
        .heatmap-container .react-calendar-heatmap text {
          fill: var(--muted-foreground);
          font-size: 8px;
        }
        .heatmap-container .react-calendar-heatmap svg {
          width: 100%;
          height: auto;
        }
        .heatmap-container .react-calendar-heatmap rect {
          rx: 2;
        }
        .heatmap-container .color-empty {
          fill: var(--muted);
        }
        .heatmap-container .color-scale-1 {
          fill: #86efac;
        }
        .heatmap-container .color-scale-2 {
          fill: #4ade80;
        }
        .heatmap-container .color-scale-3 {
          fill: #22c55e;
        }
        .heatmap-container .color-scale-4 {
          fill: #16a34a;
        }
        .dark .heatmap-container .color-scale-1 {
          fill: #14532d;
        }
        .dark .heatmap-container .color-scale-2 {
          fill: #166534;
        }
        .dark .heatmap-container .color-scale-3 {
          fill: #15803d;
        }
        .dark .heatmap-container .color-scale-4 {
          fill: #22c55e;
        }
      `}</style>
    </Card>
  );
}

function StatItem({ icon: Icon, label, value, suffix = "", color }) {
  const colorClasses = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="min-w-0 flex flex-row items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div className={`p-2 rounded-lg shrink-0 ${colorClasses[color]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg sm:text-xl font-bold truncate">
          {value}
          {suffix && <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
        </p>
        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </div>
  );
}
