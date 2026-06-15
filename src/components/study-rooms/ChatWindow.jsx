"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/contexts/auth";

export default function ChatWindow({ room }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);
  const hasAwardedXpRef = useRef(false); // ← was missing, caused crash

  useEffect(() => {
    if (!room) return;
    const q = query(
      collection(db, "rooms", room.id, "messages"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [room]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    await addDoc(collection(db, "rooms", room.id, "messages"), {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      text: text.trim(),
      timestamp: serverTimestamp(),
    });
    setText("");

    // Award XP only once per room visit
    if (!hasAwardedXpRef.current) {
      hasAwardedXpRef.current = true;
      await fetch("/api/gamification/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "help_student" }),
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.uid === user.uid ? "flex-row-reverse" : ""}`}
          >
            <img
              src={msg.photoURL}
              alt={msg.displayName}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            <div
              className={`max-w-xs px-3 py-2 rounded-2xl text-sm ${
                msg.uid === user.uid
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {msg.uid !== user.uid && (
                <p className="text-xs font-medium mb-1 opacity-70">
                  {msg.displayName}
                </p>
              )}
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
        >
          Send
        </button>
      </div>
    </div>
  );
}