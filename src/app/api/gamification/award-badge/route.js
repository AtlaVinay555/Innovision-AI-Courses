import { NextResponse } from "next/server";
<<<<<<< HEAD
import { getAdminDb } from "@/lib/firebase-admin";
=======
import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
>>>>>>> upstream/main

// POST - Award a badge to the authenticated user
export async function POST(request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.email;
    const { badgeId } = await request.json();

    if (!badgeId) {
      return NextResponse.json({ error: "badgeId required" }, { status: 400 });
    }

    const adminDbInstance = getAdminDb();
    if (!adminDbInstance) {
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({ success: true, badges: [badgeId], _mock: true });
      }
      return NextResponse.json({ error: "Firebase not configured" }, { status: 503 });
    }

    const userRef = adminDbInstance.collection("gamification").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Create user if doesn't exist
      await userRef.set({
        xp: 0,
        level: 1,
        streak: 1,
        badges: [badgeId],
        rank: 0,
        achievements: [],
        lastActive: new Date().toISOString(),
      });
      return NextResponse.json({ success: true, badges: [badgeId] });
    }

    const stats = userDoc.data();
    const currentBadges = stats.badges || [];

    // Don't add duplicate badges
    if (currentBadges.includes(badgeId)) {
      return NextResponse.json({ success: true, message: "Badge already earned", badges: currentBadges });
    }

    const newBadges = [...currentBadges, badgeId];
    await userRef.update({ badges: newBadges });

    return NextResponse.json({ success: true, badges: newBadges });
  } catch (error) {
    console.error("Error awarding badge:", error);
    return NextResponse.json({ error: "Failed to award badge" }, { status: 500 });
  }
}
