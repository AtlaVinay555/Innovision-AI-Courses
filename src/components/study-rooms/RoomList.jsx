"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/auth";

export default function RoomList({ onSelectRoom, selectedRoom }) {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "rooms"),
      where("members", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return unsub;
  }, [user?.uid]);

  if (rooms.length === 0) {
    return (
      <p className="text-sm text-muted-foreground px-2 py-4 text-center">
        No rooms yet. Create one!
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {rooms.map((room) => (
        <button
          key={room.id}
          onClick={() => onSelectRoom(room)}
          className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
            selectedRoom?.id === room.id
              ? "bg-primary/10 text-primary"
              : "hover:bg-muted text-foreground"
          }`}
        >
          <p className="text-sm font-medium truncate">{room.name}</p>
          {room.topic && (
            <p className="text-xs text-muted-foreground truncate">{room.topic}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {room.members?.length || 1} member{room.members?.length !== 1 ? "s" : ""}
          </p>
        </button>
      ))}
    </div>
  );
}