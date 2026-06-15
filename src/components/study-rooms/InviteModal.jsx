"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/auth";
import { auth } from "@/lib/firebase";

export default function InviteModal({ room, onClose }) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [errorMsg, setErrorMsg] = useState("");
  const { user } = useAuth();

  const sendInvite = async () => {
  if (!username.trim()) return;
  setStatus("loading");
  try {
    const token = await auth.currentUser.getIdToken();  // ← get token
    const res = await fetch("/api/rooms/invite", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,             // ← send it
      },
      body: JSON.stringify({ roomId: room.id, username: username.trim() }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setStatus("success");
  } catch (err) {
    setStatus("error");
    setErrorMsg(err.message);
  }
};


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h2 className="text-lg font-semibold mb-1">Invite to {room.name}</h2>
       <p className="text-sm text-muted-foreground mb-3">
  Enter the username of the person you want to invite.
</p>
<p className="text-xs text-muted-foreground mb-4 bg-muted px-3 py-2 rounded-lg">
  💡 Username is the part before <span className="font-medium">@gmail.com</span> in their email.
  For example, if their email is <span className="font-medium">john.doe@gmail.com</span>, their username is <span className="font-medium">john.doe</span>
</p>

        {status === "success" ? (
          <div className="text-center py-4">
            <p className="text-green-600 font-medium">Invite sent!</p>
            <button onClick={onClose} className="mt-3 text-sm text-muted-foreground underline">
              Close
            </button>
          </div>
        ) : (
          <>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. john_doe"
              className="w-full px-3 py-2 rounded-lg border text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {status === "error" && (
              <p className="text-sm text-red-500 mb-3">{errorMsg}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={sendInvite}
                disabled={status === "loading"}
                className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90 disabled:opacity-50"
              >
                {status === "loading" ? "Sending..." : "Send invite"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}