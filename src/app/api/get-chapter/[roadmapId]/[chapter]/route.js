import { adminDb } from "@/lib/firebase-admin";
import { getServerSession } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const session = await getServerSession();
    if (!session && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { roadmapId, chapter } = await params;

    if (process.env.NODE_ENV === "development" && roadmapId === "mock-roadmap-1") {
      return NextResponse.json({
        chapter: {
          process: "completed",
          content: {
            chapterTitle: `Chapter ${chapter}: Mock AI Visual Learning`,
            subtopics: [
              {
                title: "Introduction to Mermaid Flowcharts",
                content: `<p>This is a mock chapter for local development.</p>
                          <p>Here is an example Mermaid flowchart we can render:</p>
                          <pre><code class="language-mermaid">
graph TD
    A[Start] --> B{Is it working?}
    B -- Yes --> C[Great!]
    B -- No --> D[Debug]
    D --> B
                          </code></pre>`
              },
              {
                title: "Advanced Architecture Diagram",
                content: `<p>Another mermaid diagram to test:</p>
                          <pre><code class="language-mermaid">
sequenceDiagram
    participant User
    participant Client
    participant Server
    User->>Client: Clicks button
    Client->>Server: API Request
    Server-->>Client: Response
    Client-->>User: UI Update
                          </code></pre>`
              }
            ]
          },
          tasks: []
        }
      });
    }
    const docRef = adminDb
      .collection("users")
      .doc(session.user.email)
      .collection("roadmaps")
      .doc(roadmapId)
      .collection("chapters")
      .doc(chapter);

    const taskDocRef = adminDb
      .collection("users")
      .doc(session.user.email)
      .collection("roadmaps")
      .doc(roadmapId)
      .collection("chapters")
      .doc(chapter)
      .collection("tasks")
      .doc("task");

    const docSnap = await docRef.get();
    const taskSnap = await taskDocRef.get();
    if (docSnap.exists && docSnap.data().process === "pending") {
      return NextResponse.json({ chapter: { process: "pending" } });
    }
    if (!docSnap.exists) {
      return NextResponse.json({ message: "Chapter not found" }, { status: 404 });
    }
    const tasks = Object.values(taskSnap?.data() || {});

    return NextResponse.json({
      chapter: { ...docSnap.data(), tasks },
    });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
