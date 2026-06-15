"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function XPChart({ userId }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchXPData();

      // Refresh XP chart every 10 seconds for real-time updates
      const interval = setInterval(fetchXPData, 10000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const fetchXPData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gamification/xp-history");
      if (res.ok) {
        const result = await res.json();
        setData(result.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch XP data:", error);
    }
    setLoading(false);
  };

  const maxXP = data.length > 0 ? Math.max(...data.map(d => d.xp)) : 1;
  const totalXP = data.reduce((sum, d) => sum + d.xp, 0);
  const avgXP = data.length > 0 ? Math.round(totalXP / data.length) : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            XP This Week
          </CardTitle>
          <div className="text-right">
            <div className="text-xl font-bold text-green-500">{totalXP}</div>
            <div className="text-[10px] text-muted-foreground">Avg: {avgXP}/day</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No XP data yet. Start learning to see your progress!
          </div>
        ) : (
          <>
            {data.map((item, index) => {
              const heightPercent = (item.xp / maxXP) * 100;
              const isToday = index === data.length - 1;

              return (
                <div key={item.day} className="flex items-center gap-2">
                  <div className="w-10 text-xs font-medium text-muted-foreground">
                    {item.day}
                  </div>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-6 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isToday
                        ? 'bg-linear-to-r from-blue-500 to-purple-500'
                        : 'bg-linear-to-r from-green-400 to-green-500'
                        }`}
                      style={{ width: `${heightPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-xs font-bold text-white drop-shadow">
                        {item.xp} XP
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
