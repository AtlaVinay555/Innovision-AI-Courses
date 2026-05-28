import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";

export async function POST(request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { courseIds, action } = await request.json();

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { error: "Course IDs array is required" },
        { status: 400 }
      );
    }

    if (!action || !["delete", "archive", "unarchive"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'delete', 'archive', or 'unarchive'" },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      if (process.env.NODE_ENV === "development") {
        return NextResponse.json({
          success: true,
          message: `Bulk ${action} completed (mock)`,
          results: { success: courseIds, failed: [] },
          processed: courseIds.length,
          failed: 0,
        });
      }
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const userEmail = session.user.email;
    const results = {
      success: [],
      failed: [],
    };

    // Process each course
    for (const courseId of courseIds) {
      try {
        const courseRef = adminDb
          .collection("users")
          .doc(userEmail)
          .collection("roadmaps")
          .doc(courseId);

        if (action === "delete") {
          // Delete the course
          await courseRef.delete();
          results.success.push(courseId);
        } else if (action === "archive" || action === "unarchive") {
          // Archive or unarchive the course
          const isArchived = action === "archive";
          await courseRef.update({
            archived: isArchived,
            archivedAt: isArchived ? new Date().toISOString() : null,
            updatedAt: new Date().toISOString(),
          });
          results.success.push(courseId);
        }
      } catch (error) {
        console.error(`Error processing course ${courseId}:`, error);
        results.failed.push(courseId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      results,
      processed: results.success.length,
      failed: results.failed.length,
    });
  } catch (error) {
    console.error("Error in bulk action:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk action" },
      { status: 500 }
    );
  }
}
