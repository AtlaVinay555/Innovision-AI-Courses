import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request) {
  try {
    const adminDb = getAdminDb();
    if (!adminDb) {
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ daily: [], weekly: [], allTime: [], _mock: true });
      }
      return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
    }
    const gamificationRef = adminDb.collection("gamification");

    // Helper function to enrich user data
    const enrichUserData = async (gamificationDocs) => {
      const enrichedUsers = await Promise.all(
        gamificationDocs.map(async (gamDoc) => {
          const userId = gamDoc.id;
          const gamData = gamDoc.data();

          // Fetch user profile data
          const userDocRef = adminDb.collection("users").doc(userId);
          const userDoc = await userDocRef.get();

          let userData = {
            name: userId.split("@")[0], // fallback to email username
            avatar: null,
            coursesCompleted: 0,
          };

          if (userDoc.exists) {
            const profile = userDoc.data();
            userData = {
              name: profile.name || profile.displayName || userData.name,
              avatar: profile.photoURL || profile.image || null,
              coursesCompleted: profile.coursesCompleted || 0,
            };
          }

          return {
            id: userId,
            ...userData,
            xp: gamData.xp || 0,
            level: gamData.level || 1,
            streak: gamData.streak || 0,
            lastActive: gamData.lastActive,
          };
        })
      );

      return enrichedUsers;
    };

    // Get all-time leaderboard
    const allTimeSnapshot = await gamificationRef.orderBy("xp", "desc").limit(50).get();
    const allTime = await enrichUserData(allTimeSnapshot.docs);

    // Get weekly leaderboard (filter from all-time, users active in last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    const weekly = allTime
      .filter((user) => user.lastActive && user.lastActive >= weekAgoISO)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 50);

    // Get daily leaderboard (filter from all-time, users active today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const daily = allTime
      .filter((user) => user.lastActive && user.lastActive >= todayISO)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 50);

    return NextResponse.json({
      daily,
      weekly,
      allTime,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch leaderboard", details: error.message }, { status: 500 });
  }
}
