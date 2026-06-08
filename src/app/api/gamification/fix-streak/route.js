import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";

export async function POST(request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.email;

    const userRef = adminDb.collection("gamification").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stats = userDoc.data();

    // If streak is 0, set it to 1 (they're using it today)
    if (stats.streak === 0) {
      await userRef.update({
        streak: 1,
        lastActive: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: "Streak fixed to 1",
        newStreak: 1,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Streak already set",
      currentStreak: stats.streak,
    });
  } catch (error) {
    console.error("Error fixing streak:", error);
    return NextResponse.json({ error: "Failed to fix streak" }, { status: 500 });
  }
}
