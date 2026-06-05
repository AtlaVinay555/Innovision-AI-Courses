import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

async function getUser(req) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { getAuth } = await import("firebase-admin/auth");
    const decoded = await getAuth().verifyIdToken(token);
    return decoded;
  } catch {
    return null;
  }
}

export async function POST(req) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, topic } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Room name required" }, { status: 400 });

  const room = {
    name: name.trim(),
    topic: topic?.trim() || "",
    creatorUid: user.uid,
    members: [user.uid],
    createdAt: new Date(),
    isPublic: false,
  };

  const ref = await adminDb.collection("rooms").add(room);
  return NextResponse.json({ roomId: ref.id, ...room });
}