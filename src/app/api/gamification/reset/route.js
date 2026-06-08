import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";

/**
 * Reset gamification stats for the authenticated user
 * Usage: POST /api/gamification/reset
 */
export async function POST(request) {
  try {
    const session = await getServerSession();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.email;

    const userRef = adminDb.collection("gamification").doc(userId);
    const resetData = {
      xp: 0,
      level: 1,
      streak: 0,
      badges: [],
      rank: 0,
      achievements: [],
      lastActive: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await userRef.set(resetData);

    return NextResponse.json({
      success: true,
      message: "Gamification stats reset to 0",
      data: resetData,
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
