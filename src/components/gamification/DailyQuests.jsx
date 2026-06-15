"use client";

import { useState, useEffect, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AnimatedProgress } from "@/components/ui/animated-progress";
import {
  BookOpen, BookMarked, GraduationCap, Sparkles, Zap, Crown,
  Trophy, ClipboardCheck, Flame, Compass, Wand2, Clock, Timer,
  Gift, CheckCircle2, Star
} from "lucide-react";
import { toast } from "sonner";
import xpContext from "@/contexts/xp";
import confetti from "canvas-confetti";

const ICON_MAP = {
  BookOpen, BookMarked, GraduationCap, Sparkles, Zap, Crown,
  Trophy, ClipboardCheck, Flame, Compass, Wand2, Clock, Timer,
};

export default function DailyQuests({ userId }) {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [totalXPEarned, setTotalXPEarned] = useState(0);
  const { getXp } = useContext(xpContext);

  useEffect(() => {
    if (userId) {
      fetchQuests();
    }
  }, [userId]);

  const fetchQuests = async () => {
    try {
      const res = await fetch("/api/gamification/daily-quests");
      const data = await res.json();

      if (data.quests) {
        setQuests(data.quests);
        setTotalXPEarned(data.totalXPEarned || 0);
      }
    } catch (error) {
      console.error("Error fetching quests:", error);
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (questId) => {
    setClaiming(questId);
    try {
      const res = await fetch("/api/gamification/daily-quests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim",
          questId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Fire confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ["#FFD700", "#FFA500", "#FF6B6B"],
        });

        toast.success(`+${data.xpAwarded} XP claimed!`);

        // Update local state
        setQuests(prev => prev.map(q =>
          q.id === questId ? { ...q, claimed: true } : q
        ));
        setTotalXPEarned(prev => prev + data.xpAwarded);

        // Refresh XP context
        getXp();
      } else {
        toast.error(data.error || "Failed to claim reward");
      }
    } catch (error) {
      console.error("Error claiming reward:", error);
      toast.error("Failed to claim reward");
    } finally {
      setClaiming(null);
    }
  };

  const getQuestIcon = (iconName) => {
    const IconComponent = ICON_MAP[iconName] || Star;
    return IconComponent;
  };

  const completedCount = quests.filter(q => q.completed).length;
  const claimedCount = quests.filter(q => q.claimed).length;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-500" />
            Daily Quests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-500" />
            Daily Quests
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{completedCount}/3</span>
            {completedCount === 3 && (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>
        {totalXPEarned > 0 && (
          <p className="text-xs text-muted-foreground">
            Today's earnings: <span className="text-green-500 font-semibold">+{totalXPEarned} XP</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {quests.map((quest, index) => {
          const IconComponent = getQuestIcon(quest.icon);
          const progressPercent = (quest.progress / quest.target) * 100;

          return (
            <div
              key={quest.id}
              className={`p-3 rounded-lg border transition-all duration-300 ${quest.claimed
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : quest.completed
                  ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800 animate-pulse"
                  : "bg-card border-border hover:border-primary/30"
                }`}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${quest.claimed
                  ? "bg-green-100 dark:bg-green-900/30"
                  : quest.completed
                    ? "bg-yellow-100 dark:bg-yellow-900/30"
                    : "bg-muted"
                  }`}>
                  <IconComponent className={`h-5 w-5 ${quest.claimed
                    ? "text-green-600"
                    : quest.completed
                      ? "text-yellow-600"
                      : "text-muted-foreground"
                    }`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`font-medium text-sm ${quest.claimed ? "line-through text-muted-foreground" : ""}`}>
                      {quest.title}
                    </h4>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${quest.claimed
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}>
                      +{quest.xpReward} XP
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-2">
                    {quest.description}
                  </p>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <AnimatedProgress
                        value={progressPercent}
                        color={quest.completed ? "success" : "blue"}
                        size="sm"
                        delay={index * 100}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {quest.progress}/{quest.target}
                    </span>
                  </div>
                </div>

                {/* Claim button */}
                {quest.completed && !quest.claimed && (
                  <Button
                    size="sm"
                    onClick={() => claimReward(quest.id)}
                    disabled={claiming === quest.id}
                    className="bg-linear-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold"
                  >
                    {claiming === quest.id ? (
                      <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Gift className="h-3 w-3 mr-1" />
                        Claim
                      </>
                    )}
                  </Button>
                )}

                {quest.claimed && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                )}
              </div>
            </div>
          );
        })}

        {/* Bonus for completing all */}
        {completedCount === 3 && claimedCount === 3 && (
          <div className="mt-4 p-3 rounded-lg bg-linear-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Star className="h-4 w-4 text-purple-500" />
              <span className="font-semibold text-sm">All Quests Complete!</span>
              <Star className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Come back tomorrow for new quests
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
