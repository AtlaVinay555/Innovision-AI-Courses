"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Award, Trophy, Flame, Zap, Crown, Star, Target, Moon, Sun,
  Users, BookOpen, GraduationCap, Clock, Rocket, Heart, Shield,
  Lock, Share2, Twitter, Facebook, Linkedin, Link2, Check, X
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";

// All available badges
const ALL_BADGES = [
  {
    id: "first_course",
    name: "First Steps",
    icon: Target,
    description: "Complete your first course",
    requirement: "Complete 1 course",
    xpReward: 50,
    rarity: "common",
    color: "from-green-400 to-emerald-500"
  },
  {
    id: "week_streak",
    name: "Dedicated",
    icon: Flame,
    description: "Maintain a 7-day learning streak",
    requirement: "7 consecutive days of learning",
    xpReward: 100,
    rarity: "uncommon",
    color: "from-orange-400 to-red-500"
  },
  {
    id: "month_streak",
    name: "Unstoppable",
    icon: Flame,
    description: "Maintain a 30-day learning streak",
    requirement: "30 consecutive days of learning",
    xpReward: 500,
    rarity: "legendary",
    color: "from-red-500 to-pink-600"
  },
  {
    id: "perfect_score",
    name: "Perfectionist",
    icon: Award,
    description: "Get 100% on a quiz",
    requirement: "Score 100% on any quiz",
    xpReward: 35,
    rarity: "uncommon",
    color: "from-yellow-400 to-orange-500"
  },
  {
    id: "fast_learner",
    name: "Speed Demon",
    icon: Rocket,
    description: "Complete a course in one day",
    requirement: "Finish an entire course within 24 hours",
    xpReward: 75,
    rarity: "rare",
    color: "from-purple-400 to-indigo-500"
  },
  {
    id: "night_owl",
    name: "Night Owl",
    icon: Moon,
    description: "Study after midnight",
    requirement: "Complete a lesson between 12 AM - 4 AM",
    xpReward: 15,
    rarity: "common",
    color: "from-indigo-400 to-purple-600"
  },
  {
    id: "early_bird",
    name: "Early Bird",
    icon: Sun,
    description: "Study before 6 AM",
    requirement: "Complete a lesson between 4 AM - 6 AM",
    xpReward: 15,
    rarity: "common",
    color: "from-amber-300 to-yellow-500"
  },
  {
    id: "social",
    name: "Social Butterfly",
    icon: Users,
    description: "Help 10 students",
    requirement: "Assist 10 other learners",
    xpReward: 100,
    rarity: "rare",
    color: "from-pink-400 to-rose-500"
  },
  {
    id: "master",
    name: "Master",
    icon: Crown,
    description: "Reach level 10",
    requirement: "Earn 10,000 XP total",
    xpReward: 200,
    rarity: "epic",
    color: "from-yellow-400 to-amber-600"
  },
  {
    id: "scholar",
    name: "Scholar",
    icon: GraduationCap,
    description: "Complete 10 courses",
    requirement: "Finish 10 different courses",
    xpReward: 150,
    rarity: "rare",
    color: "from-blue-400 to-cyan-500"
  },
  {
    id: "bookworm",
    name: "Bookworm",
    icon: BookOpen,
    description: "Read 100 lessons",
    requirement: "Complete 100 lessons total",
    xpReward: 100,
    rarity: "uncommon",
    color: "from-teal-400 to-green-500"
  },
  {
    id: "legend",
    name: "Legend",
    icon: Trophy,
    description: "Reach level 50",
    requirement: "Earn 50,000 XP total",
    xpReward: 1000,
    rarity: "legendary",
    color: "from-amber-400 via-yellow-500 to-orange-500"
  },
];

const RARITY_STYLES = {
  common: { border: "border-gray-300", bg: "bg-gray-100", text: "text-gray-600", label: "Common" },
  uncommon: { border: "border-green-400", bg: "bg-green-100", text: "text-green-600", label: "Uncommon" },
  rare: { border: "border-blue-400", bg: "bg-blue-100", text: "text-blue-600", label: "Rare" },
  epic: { border: "border-purple-400", bg: "bg-purple-100", text: "text-purple-600", label: "Epic" },
  legendary: { border: "border-yellow-400", bg: "bg-yellow-100", text: "text-yellow-600", label: "Legendary" },
};

export default function BadgeGallery({ earnedBadges: propBadges = [], userName = "User" }) {
  const { user } = useAuth();
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState(propBadges);

  // Fetch badges from gamification API
  useEffect(() => {
    async function fetchBadges() {
      if (!user?.email) return;

      try {
        const res = await fetch("/api/gamification/stats");
        const data = await res.json();
        if (data?.badges && Array.isArray(data.badges)) {
          setEarnedBadges(data.badges);
        }
      } catch (error) {
        console.error("Error fetching badges:", error);
      }
    }

    fetchBadges();
    // Refresh badges every 30 seconds
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [user?.email]);

  const toggleFlip = (badgeId) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(badgeId)) {
        next.delete(badgeId);
      } else {
        next.add(badgeId);
      }
      return next;
    });
  };

  const isEarned = (badgeId) => earnedBadges.includes(badgeId);

  const shareOnTwitter = (badge) => {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://innovision.vercel.app";
    const text = `I just earned the "${badge.name}" badge on InnoVision! 🏆 ${badge.description}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(siteUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const shareOnLinkedIn = (badge) => {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://innovision.vercel.app";
    const title = `I earned the "${badge.name}" badge!`;
    const summary = `${badge.description} - Earned on InnoVision Learning Platform`;
    const url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(siteUrl)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const copyShareLink = (badge) => {
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://innovision.vercel.app";
    const text = `I earned the "${badge.name}" badge on InnoVision! ${badge.description} - ${siteUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const earnedCount = ALL_BADGES.filter(b => isEarned(b.id)).length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Badge Collection
            </CardTitle>
            <Badge variant="secondary">
              {earnedCount}/{ALL_BADGES.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {ALL_BADGES.map((badge) => {
              const earned = isEarned(badge.id);
              const isFlipped = flippedCards.has(badge.id);
              const IconComponent = badge.icon;
              const rarity = RARITY_STYLES[badge.rarity];

              return (
                <div
                  key={badge.id}
                  className="perspective-1000 cursor-pointer"
                  onClick={() => earned ? toggleFlip(badge.id) : setSelectedBadge(badge)}
                >
                  <div
                    className={`
                      relative w-full aspect-square transition-transform duration-500
                      transform-style-3d
                      ${isFlipped ? "rotate-y-180" : ""}
                    `}
                  >
                    {/* Front of card */}
                    <div
                      className={`
                        absolute inset-0 backface-hidden rounded-xl p-2
                        flex flex-col items-center justify-center
                        border-2 transition-all duration-300
                        ${earned
                          ? `bg-linear-to-br ${badge.color} ${rarity.border} shadow-lg hover:shadow-xl hover:scale-105`
                          : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        }
                      `}
                    >
                      {earned ? (
                        <>
                          <IconComponent className="h-8 w-8 text-white drop-shadow-lg" />
                          <span className="text-[10px] text-white font-medium mt-1 text-center leading-tight">
                            {badge.name}
                          </span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                            Locked
                          </span>
                        </>
                      )}
                    </div>

                    {/* Back of card (only for earned badges) */}
                    {earned && (
                      <div
                        className={`
                          absolute inset-0 backface-hidden rotate-y-180 rounded-xl p-2
                          flex flex-col items-center justify-center
                          bg-white dark:bg-gray-900 border-2 ${rarity.border}
                        `}
                      >
                        <span className={`text-[10px] font-bold ${rarity.text}`}>
                          {rarity.label}
                        </span>
                        <span className="text-xs font-semibold mt-1 text-center">
                          +{badge.xpReward} XP
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1 h-6 px-2 text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBadge(badge);
                          }}
                        >
                          Details
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rarity Legend */}
          <div className="mt-4 pt-4 border-t flex flex-wrap gap-2 justify-center">
            {Object.entries(RARITY_STYLES).map(([key, style]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${style.bg} ${style.border} border`} />
                <span className="text-[10px] text-muted-foreground">{style.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Badge Detail Dialog */}
      <Dialog open={!!selectedBadge} onOpenChange={() => setSelectedBadge(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedBadge && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`
                    p-3 rounded-xl bg-linear-to-br ${selectedBadge.color}
                    ${isEarned(selectedBadge.id) ? "" : "grayscale opacity-50"}
                  `}>
                    <selectedBadge.icon className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      {selectedBadge.name}
                      {isEarned(selectedBadge.id) ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <Badge className={RARITY_STYLES[selectedBadge.rarity].bg + " " + RARITY_STYLES[selectedBadge.rarity].text}>
                      {RARITY_STYLES[selectedBadge.rarity].label}
                    </Badge>
                  </div>
                </DialogTitle>
                <DialogDescription className="pt-4 space-y-4">
                  <p>{selectedBadge.description}</p>

                  <div className="bg-muted p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">Requirement</div>
                    <div className="font-medium">{selectedBadge.requirement}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Reward</div>
                      <div className="font-bold text-lg text-green-600">+{selectedBadge.xpReward} XP</div>
                    </div>

                    {isEarned(selectedBadge.id) && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => shareOnTwitter(selectedBadge)}
                        >
                          <Twitter className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => shareOnLinkedIn(selectedBadge)}
                        >
                          <Linkedin className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyShareLink(selectedBadge)}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                  </div>

                  {!isEarned(selectedBadge.id) && (
                    <div className="text-center py-2 text-sm text-muted-foreground">
                      Complete the requirement to unlock this badge!
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
