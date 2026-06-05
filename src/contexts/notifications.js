"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/notifications?limit=20");
            if (res.ok) {
                const data = await res.json();
                setNotifications(prev => {
                    const inviteNotifs = prev.filter(n => n.id.startsWith("invite_"));
                    return [...(data.notifications || []), ...inviteNotifs];
                });
                setUnreadCount(prev => {
                    const inviteUnread = notifications
                        .filter(n => n.id.startsWith("invite_") && !n.read).length;
                    return (data.unreadCount || 0) + inviteUnread;
                });
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        if (!user) return;
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, [user, fetchNotifications]);

    useEffect(() => {
        if (!user?.uid) return;

        const inviteQuery = query(
            collection(db, "invitations"),
            where("toEmail", "==", user.email),
            where("status", "==", "pending")
        );

        const unsubscribe = onSnapshot(inviteQuery, (snapshot) => {
            const inviteNotifs = snapshot.docs.map((d) => ({
                id: "invite_" + d.id,         
                type: "social",                
                title: `Study room invite from ${d.data().fromName}`,
                body: `You're invited to join "${d.data().roomName}"`,
                link: `/study-rooms?invite=${d.id}`,
                read: false,
                createdAt: d.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            }));
            setNotifications(prev => [
                ...prev.filter(n => !n.id.startsWith("invite_")),
                ...inviteNotifs,
            ]);
            setUnreadCount(prev => {
                const apiUnread = notifications.filter(
                    n => !n.id.startsWith("invite_") && !n.read
                ).length;
                return apiUnread + inviteNotifs.length;
            });
        });

        return () => unsubscribe(); // cleanup when user logs out or component unmounts
    }, [user?.uid]);

    const markAsRead = async (id) => {
        // invite_ notifications are Firestore-only, not in the API
        if (id.startsWith("invite_")) {
            setNotifications(prev =>
                prev.map(n => (n.id === id ? { ...n, read: true } : n))
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            return;
        }
        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ read: true }),
            });
            if (res.ok) {
                setNotifications((prev) =>
                    prev.map((n) => (n.id === id ? { ...n, read: true } : n))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const res = await fetch("/api/notifications", { method: "PATCH" });
            if (res.ok) {
                setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

    const deleteNotification = async (id) => {
        // invite_ notifications: just remove from local state (don't call API)
        if (id.startsWith("invite_")) {
            const deleted = notifications.find(n => n.id === id);
            setNotifications(prev => prev.filter(n => n.id !== id));
            if (deleted && !deleted.read) {
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            return;
        }
        try {
            const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
            if (res.ok) {
                const deleted = notifications.find((n) => n.id === id);
                setNotifications((prev) => prev.filter((n) => n.id !== id));
                if (deleted && !deleted.read) {
                    setUnreadCount((prev) => Math.max(0, prev - 1));
                }
            }
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    };

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                fetchNotifications,
                markAsRead,
                markAllAsRead,
                deleteNotification,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}