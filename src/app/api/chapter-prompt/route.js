import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { getAdminDb } from "@/lib/firebase-admin";
import { generateWithFallback } from "@/lib/gemini-config";

console.log(`[Chapter API] Imported centralized Gemini configuration.`);

const requestCache = new Map(); // Store last generation timestamp per user

function parseJsonSafe(response) {
  let text = response.trim();
  // Strip markdown code wrappers if present
  text = text.replace(/^```json\s?/, "").replace(/^```\s?/, "").replace(/\s?```$/, "").trim();
  
  try {
    const parsed = JSON.parse(text);
    console.log("[GenerateChapter] Raw JSON parsing successful.");
    return parsed;
  } catch (error) {
    console.error("[GenerateChapter] Final JSON parse failed. Response snippet:", text.substring(0, 200));
    return null;
  }
}

function sanitizeChapterContent(data) {
  if (!data || !Array.isArray(data.subtopics)) return data;

  data.subtopics.forEach(subtopic => {
    if (Array.isArray(subtopic.content)) {
      subtopic.content.forEach(item => {
        if (item.type === "mermaid" && typeof item.content === "string") {
          // Remove Markdown code block wrappers like ```mermaid\n ... \n```
          let cleaned = item.content.replace(/^```mermaid\s*\n?/i, '');
          cleaned = cleaned.replace(/^```\s*\n?/i, '');
          cleaned = cleaned.replace(/\n?```$/i, '');
          item.content = cleaned.trim();
        }
      });
    }
  });

  return data;
}

async function updateDatabase(content, chapter, roadmapId, session) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    console.log("Mock DB update for chapter:", chapter);
    return;
  }

  const docRef = adminDb
    .collection("users")
    .doc(session.user.email)
    .collection("roadmaps")
    .doc(roadmapId)
    .collection("chapters")
    .doc(chapter);

  try {
    const { tasks, ...chapterNew } = content;

    await docRef.update({ content: chapterNew, process: "completed" });

    const taskDocRef = docRef.collection("tasks").doc("task");

    await taskDocRef.set({ ...tasks });
  } catch (error) {
    console.error("Error updating database:", error);
    await docRef.delete();
  }
}

async function generateChapter(prompt, number, roadmapId, session) {
  console.log(`[GenerateChapter] Starting generation for chapter ${number}`);
  const adminDb = getAdminDb();
  const docRef = adminDb
    ? adminDb
        .collection("users")
        .doc(session.user.email)
        .collection("roadmaps")
        .doc(roadmapId)
        .collection("chapters")
        .doc(number)
    : null;

  try {
    console.log(`[GenerateChapter] Calling centralized Gemini API...`);
    
    const systemInstruction = `You are an expert educational content generator. Generate structured chapter content in valid JSON format. Include title, chapterNumber, learningObjectives, chapterDescription, and subtopics (each containing a 'content' array of objects with {type: (header1, header2, header3, para, points, code, mermaid), content: (text)}). 

VISUAL LEARNING (MERMAID) RULES:
1. You may occasionally inject a block with type: "mermaid" containing a raw Mermaid.js string (e.g., graph TD; A[Client]-->B[Server];).
2. BE SELECTIVE: ONLY generate diagrams for workflows, architectural pipelines, system interactions, hierarchies, or state transitions. DO NOT generate diagrams for basic definitions, history, or simple concepts.
3. KEEP IT SMALL: Diagrams must be under 8 nodes for mobile readability.
4. SAFE SYNTAX: Use simple graph TD or graph LR. Do NOT use quotes, parentheses, or special characters inside node labels. Do not wrap the string in markdown backticks.

Ensure text explanations remain your primary focus. Visuals are only enhancements. Also generate tasks (upto 3) (multiple-choice|fill-in-the-blank|match-the-following). Ensure valid JSON string values only.`;

    const result = await generateWithFallback(prompt, systemInstruction);
    const responseText = result.response.text();

    console.log(`[GenerateChapter] Gemini API response received. Parsing JSON...`);

    const data = parseJsonSafe(responseText);

    if (!data) {
      console.error("[GenerateChapter] Parsing completely failed.");
      throw new Error("Failed to parse AI response into valid JSON");
    }

    console.log(`[GenerateChapter] JSON parsed successfully. Sanitizing...`);
    const sanitizedData = sanitizeChapterContent(data);

    console.log(`[GenerateChapter] Saving to Database...`);
    await updateDatabase(sanitizedData, number, roadmapId, session);
    console.log(`[GenerateChapter] Successfully completed for chapter ${number}.`);
  } catch (error) {
    console.error("[GenerateChapter] Error encountered:", error);
    if (docRef) {
      let errorMessage = error.message;
      if (error.message === "QUOTA_EXCEEDED" || error.message?.includes("quota") || error.status === 429) {
        errorMessage = "API rate limit reached. Please wait a minute and try again.";
      } else if (error.message?.includes("is not found for API version") || error.message?.includes("models/")) {
        errorMessage = "Model compatibility error. The system is falling back to a secondary model.";
      }
      await docRef.update({ process: "failed", error: errorMessage });
    }
  }
}

async function cleanupStuckChapters(session, roadmapId, number) {
  const adminDb = getAdminDb();
  if (!adminDb) return;
  const docRef = adminDb
    .collection("users")
    .doc(session.user.email)
    .collection("roadmaps")
    .doc(roadmapId)
    .collection("chapters")
    .doc(number);

  const docSnap = await docRef.get();
  if (docSnap.exists) {
    const data = docSnap.data();
    const timeDiff = Date.now() - (data.timestamp || 0);

    // Timeout after 2 minutes (120 * 1000)
    if (data.process === "pending" && timeDiff > 120 * 1000) {
      console.log(`Marking stuck chapter as failed: ${number}`);
      await docRef.update({ process: "failed", error: "Generation timed out" });
    }
  }
}

export async function POST(req) {
  const { prompt, number, roadmapId } = await req.json();
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting: 10 seconds cooldown between generation requests
  const now = Date.now();
  const lastReq = requestCache.get(session.user.email);
  if (lastReq && now - lastReq < 10000) {
    return NextResponse.json({ message: "Please wait 10 seconds before generating another chapter to prevent spam." }, { status: 429 });
  }
  requestCache.set(session.user.email, now);

  try {
    const adminDb = getAdminDb();
    
    if (adminDb) {
      const chapterDocRef = adminDb
        .collection("users")
        .doc(session.user.email)
        .collection("roadmaps")
        .doc(roadmapId)
        .collection("chapters")
        .doc(number);

      await chapterDocRef.set({
        process: "pending",
        timestamp: Date.now(),
      });
    } else {
      console.log(`[POST] Mock Mode: Skipping pending state save for ${number}`);
    }

    setTimeout(() => {
      cleanupStuckChapters(session, roadmapId, number);
    }, 125 * 1000); // Wait slightly longer than the 2-min timeout check

    generateChapter(prompt, number, roadmapId, session);

    return NextResponse.json({ process: "pending" }, { status: 202 });
  } catch (error) {
    console.error("POST request error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
