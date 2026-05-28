import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

// Daily quest templates - rotates based on day
const QUEST_TEMPLATES = [
  // Learning quests
  { id: "complete_chapter", title: "Chapter Champion", description: "Complete 1 chapter", target: 1, xpReward: 25, icon: "BookOpen", type: "chapters_completed" },
  { id: "complete_2_chapters", title: "Double Down", description: "Complete 2 chapters", target: 2, xpReward: 50, icon: "BookMarked", type: "chapters_completed" },
  { id: "complete_lesson", title: "Lesson Learner", description: "Complete 3 lessons", target: 3, xpReward: 20, icon: "GraduationCap", type: "lessons_completed" },

  // XP quests
  { id: "earn_50_xp", title: "XP Hunter", description: "Earn 50 XP today", target: 50, xpReward: 15, icon: "Sparkles", type: "xp_earned" },
  { id: "earn_100_xp", title: "XP Master", description: "Earn 100 XP today", target: 100, xpReward: 30, icon: "Zap", type: "xp_earned" },
  { id: "earn_200_xp", title: "XP Legend", description: "Earn 200 XP today", target: 200, xpReward: 50, icon: "Crown", type: "xp_earned" },

  // Quiz quests
  { id: "perfect_quiz", title: "Perfect Score", description: "Get 100% on a quiz", target: 1, xpReward: 35, icon: "Trophy", type: "perfect_quizzes" },
  { id: "complete_quiz", title: "Quiz Taker", description: "Complete 2 quizzes", target: 2, xpReward: 20, icon: "ClipboardCheck", type: "quizzes_completed" },

  // Engagement quests
  { id: "login_streak", title: "Consistent Learner", description: "Maintain your streak", target: 1, xpReward: 10, icon: "Flame", type: "streak_maintained" },
  { id: "view_course", title: "Explorer", description: "View 2 different courses", target: 2, xpReward: 15, icon: "Compass", type: "courses_viewed" },
  { id: "generate_course", title: "Creator", description: "Generate a new course", target: 1, xpReward: 40, icon: "Wand2", type: "courses_generated" },

  // Time-based quests
  { id: "study_15min", title: "Quick Study", description: "Study for 15 minutes", target: 15, xpReward: 20, icon: "Clock", type: "study_minutes" },
  { id: "study_30min", title: "Dedicated Learner", description: "Study for 30 minutes", target: 30, xpReward: 40, icon: "Timer", type: "study_minutes" },
];

// Get 3 random quests for the day (seeded by date for consistency)
function getDailyQuests(dateStr) {
  const seed = dateStr.split("-").reduce((acc, num) => acc + parseInt(num), 0);
  const shuffled = [...QUEST_TEMPLATES].sort((a, b) => {
    const hashA = (seed * a.id.length) % 100;
    const hashB = (seed * b.id.length) % 100;
    return hashA - hashB;
  });

  // Pick 3 quests from different types
  const types = new Set();
  const selected = [];
  for (const quest of shuffled) {
    if (!types.has(quest.type) && selected.length < 3) {
      types.add(quest.type);
      selected.push(quest);
    }
  }
  return selected;
}

// GET - Fetch user's daily quests
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const questTemplates = getDailyQuests(today);

    const adminDb = getAdminDb();
    if (!adminDb) {
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ date: today, quests: questTemplates.map(q => ({ ...q, progress: 0, completed: false, claimed: false })), totalXPEarned: 0, allCompleted: false, allClaimed: false, _mock: true });
      }
      return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
    }

    // Get user's quest progress for today
    const userQuestsRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("dailyQuests")
      .doc(today);

    const userQuestsDoc = await userQuestsRef.get();
    let userProgress = userQuestsDoc.exists ? userQuestsDoc.data() : {};

    // Initialize progress if not exists
    if (!userProgress.quests) {
      userProgress = {
        date: today,
        quests: questTemplates.map(q => ({
          ...q,
          progress: 0,
          completed: false,
          claimed: false,
        })),
        totalXPEarned: 0,
      };
      await userQuestsRef.set(userProgress);
    }

    // Merge template data with progress (in case templates changed)
    const quests = questTemplates.map((template, idx) => {
      const saved = userProgress.quests?.find(q => q.id === template.id) || userProgress.quests?.[idx];
      return {
        ...template,
        progress: saved?.progress || 0,
        completed: saved?.completed || false,
        claimed: saved?.claimed || false,
      };
    });

    return NextResponse.json({
      date: today,
      quests,
      totalXPEarned: userProgress.totalXPEarned || 0,
      allCompleted: quests.every(q => q.completed),
      allClaimed: quests.every(q => q.claimed),
    });
  } catch (error) {
    console.error("Error fetching daily quests:", error);
    return NextResponse.json({ error: "Failed to fetch quests" }, { status: 500 });
  }
}

// POST - Update quest progress or claim reward
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, action, questId, progressIncrement, progressType } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    
    const adminDb = getAdminDb();
    if (!adminDb) {
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ success: true, _mock: true });
      }
      return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
    }

    const userQuestsRef = adminDb
      .collection("users")
      .doc(userId)
      .collection("dailyQuests")
      .doc(today);

    const userQuestsDoc = await userQuestsRef.get();

    if (!userQuestsDoc.exists) {
      return NextResponse.json({ error: "No quests found for today" }, { status: 404 });
    }

    let userProgress = userQuestsDoc.data();

    if (action === "updateProgress") {
      // Update progress for quests matching the progress type
      userProgress.quests = userProgress.quests.map(quest => {
        if (quest.type === progressType && !quest.completed) {
          const newProgress = Math.min(quest.progress + (progressIncrement || 1), quest.target);
          return {
            ...quest,
            progress: newProgress,
            completed: newProgress >= quest.target,
          };
        }
        return quest;
      });

      await userQuestsRef.update({ quests: userProgress.quests });

      return NextResponse.json({
        success: true,
        quests: userProgress.quests,
      });
    }

    if (action === "claim") {
      // Find and claim the quest reward
      const questIndex = userProgress.quests.findIndex(q => q.id === questId);

      if (questIndex === -1) {
        return NextResponse.json({ error: "Quest not found" }, { status: 404 });
      }

      const quest = userProgress.quests[questIndex];

      if (!quest.completed) {
        return NextResponse.json({ error: "Quest not completed" }, { status: 400 });
      }

      if (quest.claimed) {
        return NextResponse.json({ error: "Already claimed" }, { status: 400 });
      }

      // Mark as claimed
      userProgress.quests[questIndex].claimed = true;
      userProgress.totalXPEarned = (userProgress.totalXPEarned || 0) + quest.xpReward;

      await userQuestsRef.update({
        quests: userProgress.quests,
        totalXPEarned: userProgress.totalXPEarned,
      });

      // Award XP to user's main stats
      const userStatsRef = adminDb.collection("users").doc(userId).collection("gamification").doc("stats");
      const statsDoc = await userStatsRef.get();
      const currentXP = statsDoc.exists ? (statsDoc.data().xp || 0) : 0;

      await userStatsRef.set({
        xp: currentXP + quest.xpReward,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });

      return NextResponse.json({
        success: true,
        xpAwarded: quest.xpReward,
        quest: userProgress.quests[questIndex],
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating daily quests:", error);
    return NextResponse.json({ error: "Failed to update quests" }, { status: 500 });
  }
}
