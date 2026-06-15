import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: roadmapId } = params;

    const adminDb = getAdminDb();
    if (!adminDb) {
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({
          success: true,
          message: "Successfully unenrolled from course (mock)",
        });
      }
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    // Delete all chapter subcollections first
    const chaptersRef = adminDb
      .collection("users")
      .doc(session.user.email)
      .collection("roadmaps")
      .doc(roadmapId)
      .collection("chapters");
    const chaptersSnapshot = await chaptersRef.get();

    for (const chapterDoc of chaptersSnapshot.docs) {
      // Delete tasks subcollection
      const tasksRef = adminDb
        .collection("users")
        .doc(session.user.email)
        .collection("roadmaps")
        .doc(roadmapId)
        .collection("chapters")
        .doc(chapterDoc.id)
        .collection("tasks");
      const tasksSnapshot = await tasksRef.get();
      for (const taskDoc of tasksSnapshot.docs) {
        await taskDoc.ref.delete();
      }

      // Delete chapter document
      await chapterDoc.ref.delete();
    }

    // Delete the roadmap document
    const roadmapRef = adminDb.collection("users").doc(session.user.email).collection("roadmaps").doc(roadmapId);
    await roadmapRef.delete();

    return NextResponse.json({
      success: true,
      message: "Successfully unenrolled from course",
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to unenroll", details: error.message }, { status: 500 });
  }
}
