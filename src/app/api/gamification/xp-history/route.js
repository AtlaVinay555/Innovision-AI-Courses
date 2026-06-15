import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";

export async function GET(request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.email;

    const userRef = adminDb.collection("gamification").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ data: [] });
    }

    const stats = userDoc.data();

    // Build XP data for last 7 days from achievements
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const xpByDay = {};

    // Initialize all days to 0
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
      xpByDay[dayName] = 0;
    }

    // Sum XP from achievements in last 7 days
    if (stats.achievements && Array.isArray(stats.achievements)) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      stats.achievements.forEach((achievement) => {
        if (achievement.timestamp) {
          const date = new Date(achievement.timestamp);
          if (date >= sevenDaysAgo) {
            const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1];
            xpByDay[dayName] = (xpByDay[dayName] || 0) + (achievement.xp || 0);
          }
        }
      });
    }

    // Convert to array format
    const data = days.map((day) => ({
      day,
      xp: xpByDay[day] || 0,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching XP history:", error);
    return NextResponse.json({ error: "Failed to fetch XP history" }, { status: 500 });
  }
}
