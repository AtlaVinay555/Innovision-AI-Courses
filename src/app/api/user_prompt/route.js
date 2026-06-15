import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { getAdminDb, FieldValue } from "@/lib/firebase-admin";
import { nanoid } from "nanoid";
import { canGenerateCourse } from "@/lib/premium";
import { createNotification } from "@/lib/create-notification";
import { generateWithFallback } from "@/lib/gemini-config";

console.log(`[Roadmap API] Imported centralized Gemini configuration.`);

const requestCache = new Map(); // Store last generation timestamp per user

async function updateDatabase(details, id, user, retries = 3, context = {}) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Skipping DB update (adminDb is null). Details:", details);
      return true; // Mock success
    }
    return false;
  }
  
  const docRef = adminDb.collection("users").doc(user.email).collection("roadmaps").doc(id);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await docRef.set({ ...details, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return true;
    } catch (error) {
      console.error(`DB Attempt ${attempt} failed:`, {
        userId: user.email,
        roadmapId: id,
        attempt,
        maxRetries: retries,
        operation: context.operation || 'updateDatabase',
        prompt: context.prompt,
        error: {
          message: error.message,
          code: error.code,
          stack: error.stack
        }
      });
      if (attempt === retries) return false;
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
  return false;
}

function cleanJsonResponse(text) {
  return text
    .replace(/^```json\s?/, "")
    .replace(/^```\s?/, "")
    .replace(/\s?```$/, "")
    .trim();
}

async function generateRoadmap(prompt, id, session, user_prompt, requestId = "unknown") {
  try {
    const systemInstruction = `You are an expert curriculum designer. Generate a complete learning roadmap in strict JSON format.

Return ONLY valid JSON (no markdown, no explanations) with this exact structure:
{
  "courseTitle": "string",
  "courseDescription": "string",
  "chapters": [
    {
      "chapterNumber": 1,
      "chapterTitle": "string",
      "chapterDescription": "1 short sentence",
      "learningObjectives": ["Start with action verbs like Understand, Apply, Analyze..."],
      "contentOutline": ["Key topics as bullet points"]
    }
  ]
}

If the topic is not suitable for a structured course, return exactly: {"error": "unsuitable"}`;

    console.log(`[${requestId}] [GEMINI START] Executing generateWithFallback...`);
    const result = await generateWithFallback(prompt, systemInstruction, `roadmap:${prompt.substring(0, 20)}`);
    const response = result.response;
    const rawText = response.text();
    console.log(`[${requestId}] [GEMINI RESPONSE] Received length: ${rawText.length}`);
    const cleanedText = cleanJsonResponse(rawText);

    let parsed;
    try {
      parsed = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error(`[${requestId}] JSON Parse failed:`, cleanedText);
      throw new Error(`Invalid JSON from Gemini: ${parseError.message}`);
    }

    if (parsed.error === "unsuitable") {
      await updateDatabase({ message: "This topic is not suitable.", process: "unsuitable" }, id, session.user, 3, { operation: 'unsuitable_topic' });
      return;
    }

    const difficulty = user_prompt.difficulty === "in-depth" ? "inDepth" : (user_prompt.difficulty || "balanced");

    const adminDb = getAdminDb();
    if (adminDb) {
      await adminDb.collection("users").doc(session.user.email).set({
        email: session.user.email,
        createdAt: FieldValue.serverTimestamp(),
        roadmapLevel: {},
      }, { merge: true });
    }

    await updateDatabase({
      ...parsed,
      createdAt: Date.now(),
      difficulty,
      process: "completed",
    }, id, session.user, 3, { operation: 'course_completion' });

    // Create notification for completion
    try {
      if (adminDb) {
        await createNotification(adminDb, {
          userId: session.user.email,
          title: "Course Ready!",
          body: `Your generated course is ready.`,
          type: "progress",
          link: `/roadmap/${id}`,
        });
      }
    } catch (notifError) {
      console.warn(`[${requestId}] Failed to create course generation notification:`, notifError);
    }

    // Award 10 XP for generating a course
    try {
      if (adminDb) {
        const statsRef = adminDb.collection("gamification").doc(session.user.email);
        await adminDb.runTransaction(async (transaction) => {
          const statsDoc = await transaction.get(statsRef);
          const xpGained = 10;
          let stats = statsDoc.exists
            ? statsDoc.data()
            : {
              xp: 0,
              level: 1,
              streak: 1,
              badges: [],
              rank: 0,
              achievements: [],
              lastActive: new Date().toISOString(),
            };

          const newXP = (stats.xp || 0) + xpGained;
          const newLevel = Math.floor(newXP / 500) + 1;

          transaction.set(
            statsRef,
            {
              ...stats,
              xp: newXP,
              level: newLevel,
              lastActive: new Date().toISOString(),
              achievements: [
                ...(stats.achievements || []),
                {
                  title: "New Course Generated!",
                  description: "You generated a new AI course",
                  xp: xpGained,
                  timestamp: new Date().toISOString(),
                },
              ],
            },
            { merge: true }
          );
        });
      }
    } catch (xpError) {
      console.error(`[${requestId}] Failed to award XP for course generation:`, xpError);
    }

    console.log(`[${requestId}] Roadmap generated successfully.`);
  } catch (error) {
    console.error(`[${requestId}] Gemini generation failed:`, error);
    await updateDatabase({ message: "Generation error", process: "error" }, id, session.user, 3, { operation: 'error_handling' });
  }
}

export async function POST(req) {
  try {
    const user_prompt = await req.json();
    const requestId = user_prompt.requestId || req.headers.get("X-Request-ID") || 'unknown-req';
    console.log(`\n===========================================`);
    console.log(`[API ROUTE HIT] [${requestId}] POST /api/user_prompt`);
    const session = await getServerSession();

    if (!session?.user) {
      console.warn(`[REQUEST REJECTED: AUTH] [${requestId}] Unauthorized request.`);
      return NextResponse.json({ success: false, reason: "Unauthorized", layer: "auth", requestId }, { status: 403 });
    }

    const now = Date.now();
    const lastReq = requestCache.get(session.user.email);
    if (lastReq && now - lastReq < 15000) {
      console.warn(`[REQUEST REJECTED: COOLDOWN] [${requestId}] User requested before 15s cooldown.`);
      return NextResponse.json({ success: false, reason: "Please wait 15 seconds before generating another course.", layer: "cooldown", requestId }, { status: 429 });
    }
    requestCache.set(session.user.email, now);

    if (!user_prompt?.prompt) {
      console.warn(`[REQUEST REJECTED: VALIDATION] [${requestId}] Missing prompt.`);
      return NextResponse.json({ success: false, reason: "Prompt is required", layer: "validation", requestId }, { status: 400 });
    }

    const eligibility = await canGenerateCourse(session.user.email);
    if (!eligibility.canGenerate) {
      console.warn(`[REQUEST REJECTED: PREMIUM LIMIT] [${requestId}] Reason: ${eligibility.reason}`);
      return NextResponse.json({ success: false, reason: eligibility.reason, layer: "premium_limit", requestId }, { status: 403 });
    }

    const roadmapId = nanoid(20);
    console.log(`[API ROUTE HIT] [${requestId}] Initializing roadmap: ${roadmapId}`);

    const dbSuccess = await updateDatabase(
      { process: "pending", createdAt: Date.now() },
      roadmapId,
      session.user,
      3,
      { operation: 'initialize_roadmap' }
    );

    if (!dbSuccess) {
      return NextResponse.json({ message: "Failed to initialize" }, { status: 500 });
    }

    // Run background task
    (async () => {
      try {
        await generateRoadmap(user_prompt.prompt, roadmapId, session, user_prompt, requestId);
      } catch (err) {
        console.error(`[${requestId}] Background task fatal error:`, err);
      }
    })();

    console.log(`[API ROUTE HIT] [${requestId}] Returning 202 Accepted.`);
    return NextResponse.json({ process: "pending", id: roadmapId }, { status: 202 });
  } catch (error) {
    console.error("POST error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
