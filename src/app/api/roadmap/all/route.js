import { getAdminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminDbInstance = getAdminDb();

    // Fallback if adminDb is not configured
    if (!adminDbInstance) {
      return NextResponse.json({ docs: [], difficultyArray: [0, 0, 0] });
    }

    const roadmapsRef = adminDbInstance.collection("users").doc(session.user.email).collection("roadmaps");

    const querySnapshot = await roadmapsRef.get();

    const docs = querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        courseTitle: doc.data().courseTitle,
        courseDescription: doc.data().courseDescription,
        completed: doc.data().completed,
        createdAt: doc.data().createdAt,
        process: doc.data().process,
        difficulty: doc.data().difficulty,
        chapters: doc.data().chapters || [],
        chapterCount: doc.data().chapters?.length || 0,
        archived: doc.data().archived || false, // Include archived status
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let difficultyArray = [0, 0, 0];
    docs.forEach((e) => {
      if (e.difficulty === "inDepth") {
        difficultyArray[2] += 1;
      } else if (e.difficulty === "fast") {
        difficultyArray[0] += 1;
      } else if (e.difficulty === "balanced") {
        difficultyArray[1] += 1;
      }
    });
    return NextResponse.json({ docs, difficultyArray });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
