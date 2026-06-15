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
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId, username } = await req.json();

  // Look up invited user by username field
  const userSnap = await adminDb
    .collection("users")
    .where("username", "==", username)
    .limit(1)
    .get();

  if (userSnap.empty) {
    return NextResponse.json({ error: "User not found. Make sure you typed the username correctly." }, { status: 404 });
  }

  const invitedUserDoc = userSnap.docs[0];
  const invitedUser = invitedUserDoc.data();

  const roomSnap = await adminDb.collection("rooms").doc(roomId).get();
  if (!roomSnap.exists) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const room = roomSnap.data();

  // Check if already a member
  if (room.members.includes(invitedUserDoc.id)) {
    return NextResponse.json({ error: "User is already in this room" }, { status: 400 });
  }

  await adminDb.collection("invitations").add({
    roomId,
    roomName: room.name,
    fromUid: user.uid,
    fromName: user.name || user.email,
    toEmail: invitedUserDoc.id,      
    toUsername: username,
    status: "pending",
    createdAt: new Date(),
  });
  return NextResponse.json({ success: true });
}