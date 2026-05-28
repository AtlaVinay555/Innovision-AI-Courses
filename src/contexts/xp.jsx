"use client";

import { createContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/auth";
import confetti from "canvas-confetti";
import LevelUpModal from "@/components/gamification/LevelUpModal";
import { showAchievementToast, achievements } from "@/components/gamification/AchievementToast";
import ComboMultiplier, { getMultiplier } from "@/components/gamification/ComboMultiplier";

const xpContext = createContext();

// XP milestones that trigger celebrations
const XP_MILESTONES = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];

export const XpProvider = ({ children }) => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [show, setShow] = useState(false);
  const [changed, setChanged] = useState(0);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState({ newLevel: 1, xpGained: 0, totalXP: 0 });
  const prevXpRef = useRef(0);
  const prevLevelRef = useRef(1);
  const shownMilestonesRef = useRef(new Set());

  // Combo multiplier state
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const comboTimeoutRef = useRef(null);

  // Fire confetti for achievements
  const fireConfetti = useCallback((type = "default") => {
    const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

    switch (type) {
      case "xp_milestone":
        confetti({
          ...defaults,
          particleCount: 100,
          spread: 70,
          colors: ["#FFD700", "#FFA500", "#FF8C00", "#FFB347"],
        });
        break;

      case "level_up":
        // Level up modal handles its own confetti
        break;

      case "combo":
        confetti({
          ...defaults,
          particleCount: 30,
          spread: 50,
          colors: ["#3B82F6", "#8B5CF6", "#F97316"],
        });
        break;

      default:
        confetti({ ...defaults, particleCount: 50, spread: 60 });
    }
  }, []);

  // Award a badge to the user
  const awardBadge = useCallback(async (badgeId) => {
    if (!user?.email) return;

    if (process.env.NODE_ENV === "development") {
      console.log(`[Mock Gamification] Awarded badge: ${badgeId}`);
      showAchievementToast({
        title: "Badge Earned!",
        description: `You unlocked a new badge: ${badgeId.replace(/_/g, " ")} (Mock)`,
        xp: 25,
        icon: "trophy",
        type: "badge",
      });
      fireConfetti("xp_milestone");
      return { success: true, badgeId };
    }

    try {
      const res = await fetch("/api/gamification/award-badge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.email, badgeId }),
      });
      
      if (!res.ok) {
         console.warn(`[Gamification API] Error ${res.status} awarding badge`);
         return { success: false };
      }
      
      const data = await res.json();

      if (data.success) {
        // Show achievement toast for new badge
        showAchievementToast({
          title: "Badge Earned!",
          description: `You unlocked a new badge: ${badgeId.replace(/_/g, " ")}`,
          xp: 25,
          icon: "trophy",
          type: "badge",
        });
        fireConfetti("xp_milestone");
      }
      return data;
    } catch (error) {
      console.warn("[Gamification] Safely caught error awarding badge:", error);
      return { success: false };
    }
  }, [user, fireConfetti]);

  // Track timeout refs for cleanup
  const comboHideTimeoutRef = useRef(null);

  // Increment combo on correct answer
  const incrementCombo = useCallback(() => {
    setCombo(prev => {
      const newCombo = prev + 1;
      console.log("Combo incremented to:", newCombo);

      // Show combo popup when reaching 2+ streak
      if (newCombo >= 2) {
        setShowCombo(true);

        // Fire confetti at tier thresholds
        if (newCombo === 2 || newCombo === 5 || newCombo === 10 || newCombo === 20) {
          fireConfetti("combo");
        }

        // Clear existing hide timeout
        if (comboHideTimeoutRef.current) {
          clearTimeout(comboHideTimeoutRef.current);
        }
        comboHideTimeoutRef.current = setTimeout(() => setShowCombo(false), 3000);
      }

      return newCombo;
    });

    // Reset combo after 60 seconds of inactivity (longer for better UX)
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    comboTimeoutRef.current = setTimeout(() => {
      setCombo(0);
      console.log("Combo reset due to timeout");
    }, 60000);
  }, [fireConfetti]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) {
        clearTimeout(comboTimeoutRef.current);
      }
      if (comboHideTimeoutRef.current) {
        clearTimeout(comboHideTimeoutRef.current);
      }
      if (changeTimeoutRef.current) {
        clearTimeout(changeTimeoutRef.current);
      }
      milestoneTimeoutRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      milestoneTimeoutRef.current = [];
    };
  }, []);

  // Reset combo on wrong answer
  const resetCombo = useCallback(() => {
    setCombo(0);
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
  }, []);

  // Get current multiplier
  const getCurrentMultiplier = useCallback(() => {
    return getMultiplier(combo);
  }, [combo]);

  // Track milestone timeouts for cleanup
  const milestoneTimeoutRef = useRef([]);

  // Check for XP milestones and show achievement toasts
  const checkMilestones = useCallback((oldXP, newXP, oldLevel, newLevel) => {
    // Check XP milestones
    for (const milestone of XP_MILESTONES) {
      if (oldXP < milestone && newXP >= milestone && !shownMilestonesRef.current.has(`xp_${milestone}`)) {
        shownMilestonesRef.current.add(`xp_${milestone}`);
        fireConfetti("xp_milestone");

        // Show achievement toast for XP milestones
        if (milestone === 100) achievements.xp100();
        else if (milestone === 500) achievements.xp500();
        else if (milestone === 1000) achievements.xp1000();
        else if (milestone === 5000) achievements.xp5000();
        else {
          showAchievementToast({
            title: `${milestone.toLocaleString()} XP!`,
            description: `You've earned ${milestone.toLocaleString()} total XP`,
            xp: Math.floor(milestone / 100),
            icon: "sparkles",
            type: "milestone",
          });
        }
        break;
      }
    }

    // Check level up - show modal and achievement toast
    if (newLevel > oldLevel && !shownMilestonesRef.current.has(`level_${newLevel}`)) {
      shownMilestonesRef.current.add(`level_${newLevel}`);

      // Show level achievement toasts for milestone levels
      if (newLevel === 5) {
        const timeoutId = setTimeout(() => achievements.level5(), 3500);
        milestoneTimeoutRef.current.push(timeoutId);
      }
      else if (newLevel === 10) {
        const timeoutId = setTimeout(() => achievements.level10(), 3500);
        milestoneTimeoutRef.current.push(timeoutId);
      }
      else if (newLevel === 25) {
        const timeoutId = setTimeout(() => achievements.level25(), 3500);
        milestoneTimeoutRef.current.push(timeoutId);
      }

      setLevelUpData({
        newLevel,
        xpGained: newXP - oldXP,
        totalXP: newXP,
      });
      const modalTimeoutId = setTimeout(() => setShowLevelUpModal(true), 300);
      milestoneTimeoutRef.current.push(modalTimeoutId);
    }
  }, [fireConfetti]);

  // Cleanup milestone timeouts on unmount
  useEffect(() => {
    return () => {
      milestoneTimeoutRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      milestoneTimeoutRef.current = [];
    };
  }, []);

  // Track change timeout for cleanup
  const changeTimeoutRef = useRef(null);

  async function change() {
    setShow(true);
    if (changeTimeoutRef.current) {
      clearTimeout(changeTimeoutRef.current);
    }
    changeTimeoutRef.current = setTimeout(() => {
      setShow(false);
      setChanged(0);
    }, 2000);
  }

  const getXp = useCallback(async () => {
    if (!user?.email) return;

    if (process.env.NODE_ENV === "development") {
      // Mock XP fetch
      return;
    }

    try {
      const res = await fetch(`/api/gamification/stats?userId=${user.email}`);
      if (!res.ok) {
        console.warn(`[Gamification API] Error ${res.status} fetching stats`);
        return;
      }
      const data = await res.json();

      if (data && typeof data.xp === "number") {
        const xpDiff = data.xp - xp;
        const newLevel = data.level || Math.floor(data.xp / 500) + 1;

        if (xpDiff > 0 && xp > 0) {
          setChanged(xpDiff);
          change();
          // Check for milestone achievements
          checkMilestones(prevXpRef.current, data.xp, prevLevelRef.current, newLevel);
        }

        prevXpRef.current = data.xp;
        prevLevelRef.current = newLevel;
        setXp(data.xp);
        setLevel(newLevel);
      }
    } catch (error) {
      console.warn("[Gamification] Safely caught error fetching XP:", error);
    }
  }, [user, xp, checkMilestones]);

  const awardXP = useCallback(
    async (action, value = null, useComboMultiplier = false) => {
      if (!user?.email) return;

      let finalValue = value || 10; // Default mock value
      let multiplier = 1;

      if (useComboMultiplier && combo >= 2) {
        multiplier = getMultiplier(combo);
        if (typeof value === "number") {
          finalValue = value * multiplier;
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.log(`[Mock Gamification] Awarded XP for ${action}: ${finalValue}`);
        
        // Mock the state update directly without API
        const newTotalXp = xp + finalValue;
        const newLevel = Math.floor(newTotalXp / 500) + 1;
        
        setChanged(finalValue);
        change();
        checkMilestones(prevXpRef.current, newTotalXp, prevLevelRef.current, newLevel);
        
        prevXpRef.current = newTotalXp;
        prevLevelRef.current = newLevel;
        setXp(newTotalXp);
        setLevel(newLevel);
        
        return { success: true, multiplier, originalValue: value, finalValue };
      }

      try {
        const res = await fetch("/api/gamification/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.email,
            action,
            value: finalValue,
          }),
        });

        if (!res.ok) {
           console.warn(`[Gamification API] Error ${res.status} awarding XP`);
           return { success: false };
        }

        const result = await res.json();

        if (result.success) {
          // Refresh XP to show the update
          await getXp();
          return { ...result, multiplier, originalValue: value, finalValue };
        }
      } catch (error) {
        console.warn("[Gamification] Safely caught error awarding XP:", error);
        return { success: false };
      }
    },
    [user, getXp, combo, xp, checkMilestones]
  );

  useEffect(() => {
    if (user?.email) {
      getXp();

      // Poll for XP updates every 10 seconds for real-time feel
      const interval = setInterval(getXp, 10000);
      return () => clearInterval(interval);
    }
  }, [user, getXp]);

  // Listen for test combo event
  useEffect(() => {
    const handleTestCombo = () => {
      incrementCombo();
    };

    window.addEventListener("testCombo", handleTestCombo);
    return () => window.removeEventListener("testCombo", handleTestCombo);
  }, [incrementCombo]);

  return (
    <xpContext.Provider value={{
      getXp,
      awardXP,
      xp,
      level,
      show,
      changed,
      fireConfetti,
      showAchievementToast,
      achievements,
      // Combo multiplier
      combo,
      incrementCombo,
      resetCombo,
      getCurrentMultiplier,
      // Badge awarding
      awardBadge,
    }}>
      {children}
      <LevelUpModal
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
        newLevel={levelUpData.newLevel}
        xpGained={levelUpData.xpGained}
        totalXP={levelUpData.totalXP}
      />
      <ComboMultiplier combo={combo} show={showCombo} />
    </xpContext.Provider>
  );
};

export default xpContext;
