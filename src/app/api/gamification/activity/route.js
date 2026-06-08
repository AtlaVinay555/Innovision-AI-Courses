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
      return NextResponse.json({ activities: {} });
    }

    const stats = userDoc.data();

    // Build activity map from achievements
    const activityData = {};

    if (stats.achievements && Array.isArray(stats.achievements)) {
      stats.achievements.forEach((achievement) => {
        if (achievement.timestamp) {
          const date = new Date(achievement.timestamp);
          const dateStr = date.toISOString().split("T")[0];
          activityData[dateStr] = (activityData[dateStr] || 0) + 1;
        }
      });
    }

    return NextResponse.json({
      success: true,
      activities: activityData,
    });
  } catch (error) {
    console.error("Error fetching activity data:", error);
    return NextResponse.json({ error: "Failed to fetch activity data" }, { status: 500 });
  }
}
