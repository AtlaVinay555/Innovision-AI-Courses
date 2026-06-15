import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { cookies } from "next/headers";
export async function GET(request, { params }) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: "Database not available" },
                { status: 503 }
            );
        }

        const { courseId } = await params;

        let userId = null;
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session");

        if (sessionCookie) {
            try {
                const { getAuth } = await import("firebase-admin/auth");
                const decoded = await getAuth().verifySessionCookie(
                    sessionCookie.value,
                    true
                );
                userId = decoded.email || decoded.uid;
            } catch {
                // try token
            }
        }

        if (!userId) {
            const authHeader = request.headers.get("authorization");
            if (authHeader) {
                try {
                    const { getAuth } = await import("firebase-admin/auth");
                    const token = authHeader.replace("Bearer ", "");
                    const decoded = await getAuth().verifyIdToken(token);
                    userId = decoded.email || decoded.uid;
                } catch {
                    // auth failed
                }
            }
        }

        if (!userId) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

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
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const progressRef = db
            .collection("ingested_courses")
            .doc(courseId)
            .collection("progress")
            .doc(userId);

        const progressSnap = await progressRef.get();
        const progressData = progressSnap.exists ? progressSnap.data() : {
            completedChapters: [],
            lastAccessedAt: null,
            createdAt: new Date(),
        };

        const totalChapters = courseData.metadata?.chapterCount || 0;
        const completedCount = progressData.completedChapters?.length || 0;
        const progress = totalChapters > 0
            ? Math.round((completedCount / totalChapters) * 100)
            : 0;

        return NextResponse.json({
            courseId,
            progress,
            completedChapters: progressData.completedChapters || [],
            totalChapters,
            lastAccessedAt: progressData.lastAccessedAt?.toDate?.() || null,
        });
    } catch (error) {
        console.error("Error fetching progress:", error);
        return NextResponse.json(
            { error: "Failed to fetch progress" },
            { status: 500 }
        );
    }
}


export async function PUT(request, { params }) {
    try {
        const db = getAdminDb();
        if (!db) {
            return NextResponse.json(
                { error: "Database not available" },
                { status: 503 }
            );
        }

        const { courseId } = await params;
        let { chapterNumber, completed } = await request.json();

        chapterNumber = Number(chapterNumber);

        if (isNaN(chapterNumber) || completed === undefined) {
            return NextResponse.json(
                { error: "chapterNumber (number) and completed (boolean) are required" },
                { status: 400 }
            );
        }

        let userId = null;
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("session");

        if (sessionCookie) {
            try {
                const { getAuth } = await import("firebase-admin/auth");
                const decoded = await getAuth().verifySessionCookie(
                    sessionCookie.value,
                    true
                );
                userId = decoded.email || decoded.uid;
            } catch {

            }
        }

        if (!userId) {
            const authHeader = request.headers.get("authorization");
            if (authHeader) {
                try {
                    const { getAuth } = await import("firebase-admin/auth");
                    const token = authHeader.replace("Bearer ", "");
                    const decoded = await getAuth().verifyIdToken(token);
                    userId = decoded.email || decoded.uid;
                } catch {

                }
            }
        }

        if (!userId) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

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
                { error: "Unauthorized" },
                { status: 403 }
            );
        }


        const progressRef = db
            .collection("ingested_courses")
            .doc(courseId)
            .collection("progress")
            .doc(userId);

        const progressSnap = await progressRef.get();
        let completedChapters = progressSnap.exists
            ? (progressSnap.data().completedChapters || [])
            : [];


        if (completed && !completedChapters.includes(chapterNumber)) {
            completedChapters.push(chapterNumber);
            completedChapters.sort((a, b) => a - b);
        } else if (!completed) {
            completedChapters = completedChapters.filter(ch => Number(ch) !== chapterNumber);
        }

        const totalChapters = courseData.metadata?.chapterCount || 0;
        const currentProgress = progressSnap.exists ? (progressSnap.data().progress || 0) : 0;

        const newProgress = totalChapters > 0
            ? Math.round((completedChapters.length / totalChapters) * 100)
            : 0;

        const finalProgress = Math.max(currentProgress, newProgress);


        await progressRef.set({
            completedChapters,
            progress: finalProgress,
            lastAccessedAt: new Date(),
            updatedAt: new Date(),
        }, { merge: true });

        // Trigger course completion email if reached 100%
        if (finalProgress === 100 && currentProgress < 100) {
            try {
                const { sendCourseCompletionEmail } = await import("@/lib/brevo");
                await sendCourseCompletionEmail(userId, userId, courseData.title || "Your Ingested Course");
            } catch (emailError) {
                console.error("Failed to send completion email:", emailError);
            }
        }

        if (completed) {
            try {
                const xpResponse = await fetch(`${request.nextUrl.origin}/api/gamification/stats`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        cookie: request.headers.get("cookie") || "",
                    },
                    body: JSON.stringify({
                        action: "complete_chapter",
                        metadata: {
                            courseId,
                            courseType: "ingested",
                            chapterNumber,
                        },
                    }),
                });
                if (!xpResponse.ok) {
                    console.warn("Failed to award XP for chapter completion");
                }
            } catch (xpError) {
                console.warn("XP award error:", xpError);
            }
        }

        return NextResponse.json({
            success: true,
            progress: finalProgress,
            completedChapters,
        });
    } catch (error) {
        console.error("Error updating progress:", error);
        return NextResponse.json(
            { error: "Failed to update progress" },
            { status: 500 }
        );
    }
}
