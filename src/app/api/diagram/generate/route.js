import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth-server";
import { generateWithFallback } from "@/lib/gemini-config";

export async function POST(req) {
  try {
    const session = await getServerSession();
    if (!session && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { topicContext } = body;

    if (!topicContext) {
      return NextResponse.json({ message: "Topic context is required" }, { status: 400 });
    }

    const systemInstruction = `You are an expert technical architect and visual designer. 
Analyze the provided educational content and determine if a visual diagram (flowchart, architecture diagram, process flow, or relationship map) would significantly aid learning.

If a visual diagram is highly beneficial (e.g., for pipelines, architectures, workflows, state transitions), generate it using Mermaid.js syntax.
If the content is mostly definitional, historical, or purely conceptual without clear structural flow, do NOT generate a diagram.

Return ONLY a strict JSON object with this exact schema:
{
  "type": "mermaid" | "none",
  "content": "raw mermaid.js syntax string (if type is mermaid, otherwise empty string)"
}

MERMAID RULES:
1. Keep the diagram concise and mobile-friendly (under 12 nodes).
2. Do not use quotes, parentheses, or special characters inside node labels.
3. Do not wrap the output in markdown backticks. Return valid JSON only.`;

    const result = await generateWithFallback(JSON.stringify(topicContext), systemInstruction);
    const responseText = result.response.text();
    
    // Clean potential markdown wrappers from Gemini JSON
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/^```json\s?/, "").replace(/^```\s?/, "").replace(/\s?```$/, "").trim();

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (err) {
      console.error("[Diagram API] Failed to parse JSON:", cleanedText);
      return NextResponse.json({ message: "Failed to parse diagram data" }, { status: 500 });
    }

    // Additional sanitization for mermaid content
    if (data.type === "mermaid" && data.content) {
      let cleanedMermaid = data.content.replace(/^```mermaid\s*\n?/i, '');
      cleanedMermaid = cleanedMermaid.replace(/^```\s*\n?/i, '');
      cleanedMermaid = cleanedMermaid.replace(/\n?```$/i, '');
      data.content = cleanedMermaid.trim();
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Diagram API] Error generating diagram:", error);
    
    if (error.message === "QUOTA_EXCEEDED") {
      return NextResponse.json({ message: "Diagram generation temporarily unavailable (API Quota Exceeded). Please try again later." }, { status: 429 });
    }
    
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
