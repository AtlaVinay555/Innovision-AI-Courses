import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

/**
 * Helper to resolve userId from session cookie or Bearer token
 */
async function getUserId(request) {
    try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session");
        if (sessionCookie) {
            const { getAuth } = await import("firebase-admin/auth");
            const decoded = await getAuth().verifySessionCookie(sessionCookie.value, true);
            return decoded.email || decoded.uid;
        }
    } catch { }
    try {
        const authHeader = request.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const { getAuth } = await import("firebase-admin/auth");
            const decoded = await getAuth().verifyIdToken(authHeader.replace("Bearer ", ""));
            return decoded.email || decoded.uid;
        }
    } catch { }
    return null;
}

/**
 * GET /api/ingested-courses/[courseId] - Get a specific ingested course with its chapters
 */
export async function GET(request, { params }) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: "Database not available" },
                { status: 503 }
            );
        }

        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const { courseId } = await params;
        const courseRef = db.collection("ingested_courses").doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        const courseData = courseSnap.data();
        
        if (courseData.userId !== userId) {
            return NextResponse.json(
                { error: "Forbidden: you do not own this course" },
                { status: 403 }
            );
        }

        // Fetch progress
        let progressData = { progress: 0, completedChapters: [] };
        const progressRef = courseRef.collection("progress").doc(userId);
        const progressSnap = await progressRef.get();
        if (progressSnap.exists) {
            progressData = progressSnap.data();
        }

        // Fetch chapters
        const chaptersSnap = await courseRef
            .collection("chapters")
            .orderBy("order", "asc")
            .get();

        const chapters = chaptersSnap.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                chapterNumber: data.chapterNumber,
                title: data.title,
                summary: data.summary,
                wordCount: data.wordCount,
                order: data.order,
                isCompleted: progressData.completedChapters?.includes(data.chapterNumber) || false,
            };
        });

        return NextResponse.json({
            course: {
                id: courseSnap.id,
                title: courseData.title,
                description: courseData.description,
                metadata: courseData.metadata,
                source: courseData.source,
                status: courseData.status,
                createdAt: courseData.createdAt?.toDate?.() || null,
                progress: progressData.progress || 0,
            },
            chapters,
        });
    } catch (error) {
        console.error("Error fetching ingested course:", error);
        return NextResponse.json(
            { error: "Failed to fetch course" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/ingested-courses/[courseId] - Delete a specific ingested course
 */
export async function DELETE(request, { params }) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: "Database not available" },
                { status: 503 }
            );
        }

        const userId = await getUserId(request);
        if (!userId) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        const { courseId } = await params;
        const courseRef = db.collection("ingested_courses").doc(courseId);
        const courseSnap = await courseRef.get();

        if (!courseSnap.exists) {
            return NextResponse.json(
                { error: "Course not found" },
                { status: 404 }
            );
        }

        // Verify ownership
        const courseData = courseSnap.data();
        if (courseData.userId !== userId) {
            return NextResponse.json(
                { error: "Forbidden: you do not own this course" },
                { status: 403 }
            );
        }

        // Delete chapters sub-collection
        const chaptersSnap = await courseRef.collection("chapters").get();
        const chapterDeletes = chaptersSnap.docs.map((doc) => doc.ref.delete());
        await Promise.all(chapterDeletes);

        // Delete progress sub-collection
        const progressSnap = await courseRef.collection("progress").get();
        const progressDeletes = progressSnap.docs.map((doc) => doc.ref.delete());
        await Promise.all(progressDeletes);

        // Delete the course document itself
        await courseRef.delete();

        return NextResponse.json({ success: true, message: "Course deleted successfully" });
    } catch (error) {
        console.error("Error deleting ingested course:", error);
        return NextResponse.json(
            { error: "Failed to delete course" },
            { status: 500 }
        );
    }
}
