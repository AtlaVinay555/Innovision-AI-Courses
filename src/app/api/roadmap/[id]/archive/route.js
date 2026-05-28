import { getAdminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { archived } = await req.json();

    if (typeof archived !== "boolean") {
      return NextResponse.json(
        { message: "Invalid archived value. Must be boolean." },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({
          message: archived ? "Course archived successfully (mock)" : "Course unarchived successfully (mock)",
          archived: archived,
        });
      }
      return NextResponse.json({ message: "Database not configured" }, { status: 503 });
    }

    const docRef = adminDb
      .collection("users")
      .doc(session.user.email)
      .collection("roadmaps")
      .doc(id);

    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ message: "Roadmap not found" }, { status: 404 });
    }

    // Update the archived status
    await docRef.update({
      archived: archived,
      archivedAt: archived ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      message: archived ? "Course archived successfully" : "Course unarchived successfully",
      archived: archived,
    });
  } catch (error) {
    console.error("Error archiving roadmap:", error);
    return NextResponse.json(
      { message: "Failed to archive course", error: error.message },
      { status: 500 }
    );
  }
}
