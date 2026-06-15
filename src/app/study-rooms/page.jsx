"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { Users, Plus, X, Check } from "lucide-react";
import RoomList from "@/components/study-rooms/RoomList";
import ChatWindow from "@/components/study-rooms/ChatWindow";
import InviteModal from "@/components/study-rooms/InviteModal";
import { useSearchParams, useRouter } from "next/navigation";

export default function StudyRoomsPage() {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomTopic, setRoomTopic] = useState("");
  const [creating, setCreating] = useState(false);

  // Invite acceptance state
  const [pendingInvite, setPendingInvite] = useState(null); // { id, roomId, roomName, fromName }
  const [inviteAction, setInviteAction] = useState(null);   // "accepting" | "declining" | "done"

  const searchParams = useSearchParams();
  const router = useRouter();

  // On load, check if URL has ?invite=INVITE_ID
  useEffect(() => {
    const inviteId = searchParams.get("invite");
    if (!inviteId || !user) return;

    const fetchInvite = async () => {
      try {
        const inviteSnap = await getDoc(doc(db, "invitations", inviteId));
        if (!inviteSnap.exists()) return;
        const data = inviteSnap.data();

        // Only show if this invite is for the current user and still pending
        if (data.toEmail !== user.email || data.status !== "pending") return;

        setPendingInvite({ id: inviteId, ...data });
      } catch (err) {
        console.error("Error fetching invite:", err);
      }
    };

    fetchInvite();
  }, [searchParams, user]);

  const acceptInvite = async () => {
    if (!pendingInvite || !user) return;
    setInviteAction("accepting");
    try {
      // 1. Add user to room members
      await updateDoc(doc(db, "rooms", pendingInvite.roomId), {
        members: arrayUnion(user.uid),
      });

      // 2. Mark invite as accepted
      await updateDoc(doc(db, "invitations", pendingInvite.id), {
        status: "accepted",
      });

      // 3. Load the room and select it so user lands in the chat
      const roomSnap = await getDoc(doc(db, "rooms", pendingInvite.roomId));
      if (roomSnap.exists()) {
        setSelectedRoom({ id: roomSnap.id, ...roomSnap.data() });
      }

      setInviteAction("done");
      setPendingInvite(null);

      // Clean URL
      router.replace("/study-rooms");
    } catch (err) {
      console.error("Error accepting invite:", err);
      setInviteAction(null);
    }
  };

  const declineInvite = async () => {
    if (!pendingInvite) return;
    setInviteAction("declining");
    try {
      await updateDoc(doc(db, "invitations", pendingInvite.id), {
        status: "declined",
      });
      setPendingInvite(null);
      setInviteAction(null);
      router.replace("/study-rooms");
    } catch (err) {
      console.error("Error declining invite:", err);
      setInviteAction(null);
    }
  };

  const createRoom = async () => {
    if (!roomName.trim() || !user) return;
    setCreating(true);
    try {
      const docRef = await addDoc(collection(db, "rooms"), {
        name: roomName.trim(),
        topic: roomTopic.trim(),
        creatorUid: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
        isPublic: false,
      });
      setSelectedRoom({ id: docRef.id, name: roomName.trim(), topic: roomTopic.trim(), members: [user.uid] });
      setRoomName("");
      setRoomTopic("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error creating room:", err);
    } finally {
      setCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-muted-foreground">Please log in to access study rooms.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] mt-16">

      {/* INVITE BANNER — shown when URL has ?invite=... */}
      {pendingInvite && (
        <div className="w-full bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                <span className="text-primary">{pendingInvite.fromName}</span> invited you to join{" "}
                <span className="font-semibold">"{pendingInvite.roomName}"</span>
              </p>
              <p className="text-xs text-muted-foreground">Study room invitation</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={declineInvite}
              disabled={!!inviteAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Decline
            </button>
            <button
              onClick={acceptInvite}
              disabled={!!inviteAction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {inviteAction === "accepting" ? "Joining..." : "Accept & Join"}
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-72 border-r border-border flex flex-col shrink-0">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Study Rooms</span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-7 w-7 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Create room"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            <RoomList onSelectRoom={setSelectedRoom} selectedRoom={selectedRoom} />
          </div>
        </div>

        {/* RIGHT — chat area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedRoom ? (
            <>
              <div className="h-14 border-b border-border px-4 flex items-center justify-between shrink-0">
                <div>
                  <p className="font-medium text-sm">{selectedRoom.name}</p>
                  {selectedRoom.topic && (
                    <p className="text-xs text-muted-foreground">{selectedRoom.topic}</p>
                  )}
                </div>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:bg-muted transition-colors"
                >
                  <Users className="h-3.5 w-3.5" />
                  Invite
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <ChatWindow room={selectedRoom} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">No room selected</p>
                <p className="text-sm text-muted-foreground">
                  Pick a room from the sidebar or create a new one
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                Create a room
              </button>
            </div>
          )}
        </div>
      </div>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-xl p-6 w-full max-w-sm shadow-xl border border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create a study room</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Room name (e.g. React Study Group)"
              className="w-full px-3 py-2 rounded-lg border text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
            <input
              value={roomTopic}
              onChange={(e) => setRoomTopic(e.target.value)}
              placeholder="Topic (optional)"
              className="w-full px-3 py-2 rounded-lg border text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-primary bg-background"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createRoom}
                disabled={!roomName.trim() || creating}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE MODAL */}
      {showInviteModal && selectedRoom && (
        <InviteModal room={selectedRoom} onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
}