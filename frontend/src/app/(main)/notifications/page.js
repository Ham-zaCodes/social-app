"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/services/api";

const typeConfig = {
  FOLLOW: {
    icon: "👤",
    color: "text-indigo-400",
    text: "started following you",
  },
  COMMENT: {
    icon: "💬",
    color: "text-blue-400",
    text: "commented on your post",
  },
  LIKE: { icon: "❤️", color: "text-red-400", text: "liked your post" },
  MESSAGE: { icon: "✉️", color: "text-green-400", text: "sent you a message" },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/users/notifications")
      .then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Page open hone par sab read mark karo
    apiClient.post("/users/notifications/read").catch(() => {});
  }, []);

  const unread = notifications.filter((n) => !n.is_read).length;

  const handleNotificationClick = (notification) => {
    if (!notification?.sender_username) return;

    if (notification.type === "MESSAGE") {
      router.push(
        `/messages?user=${encodeURIComponent(notification.sender_username)}`,
      );
      return;
    }

    router.push(`/users/${encodeURIComponent(notification.sender_username)}`);
  };

  return (
    <main className="flex-1 max-w-2xl min-h-0 h-full overflow-y-auto app-scroll-container pt-8 pb-16">
      <div className="border-b border-white/[0.06] pb-4 mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight">
          Notifications
          {unread > 0 && (
            <span className="ml-2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unread}
            </span>
          )}
        </h1>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 text-center py-12">Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-12 text-center text-gray-500 text-sm">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] || {
              icon: "🔔",
              color: "text-gray-400",
              text: "interacted with you",
            };
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleNotificationClick(n)}
                className={`flex w-full items-center gap-4 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  !n.is_read
                    ? "bg-indigo-500/[0.06] border-indigo-500/20"
                    : "bg-white/[0.01] border-white/[0.04]"
                }`}
              >
                <div className="flex-shrink-0">
                  {n.sender_avatar ? (
                    <img
                      src={n.sender_avatar}
                      alt={n.sender_username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-sm text-white uppercase">
                      {n.sender_username?.[0] || "U"}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200">
                    <span className="font-semibold text-white hover:text-indigo-300 transition-colors">
                      {n.sender_username}
                    </span>{" "}
                    <span className={cfg.color}>{cfg.text}</span>
                  </p>
                  {n.type === "COMMENT" && n.comment_text && (
                    <p className="text-xs text-gray-400 mt-1 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05] truncate">
                      "{n.comment_text}"
                    </p>
                  )}
                  {n.type === "MESSAGE" && n.message_text && (
                    <p className="text-xs text-gray-400 mt-1 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05] truncate">
                      "{n.message_text}"
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-0.5">
                    {timeAgo(n.created_at)}
                  </p>
                </div>

                <span className="text-xl flex-shrink-0">{cfg.icon}</span>

                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
