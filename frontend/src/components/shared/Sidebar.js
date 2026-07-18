"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/api";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  // Unread notifications count fetch karo
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!user || !token) return;
    apiClient.get("/users/notifications")
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setUnreadCount(data.filter((n) => !n.is_read).length);
      })
      .catch(() => {});
  }, [user?.id, pathname]); // pathname change hone par refresh — notifications page se wapas aane par 0 ho jaye

  const navItems = [
    { href: "/home",          icon: "🏠", label: "Home" },
    { href: "/notifications", icon: "🔔", label: "Notifications", badge: unreadCount },
    { href: "/messages",      icon: "💬", label: "Messages" },
    { href: "/profile",       icon: "👤", label: "Profile" },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 pt-8 pb-4 border-r border-white/[0.06] justify-between">
      <div className="space-y-8">
        {/* Logo */}
        <div className="inline-flex items-center gap-3 px-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-black text-xl shadow-lg">
            S
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            Sphere
          </span>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                pathname === item.href
                  ? "bg-white/[0.06] text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              <span className="flex items-center gap-4">
                <span>{item.icon}</span>
                {item.label}
              </span>
              {item.badge > 0 && (
                <span className="bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* User card */}
      {user && (
        <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
          <div className="flex items-center gap-3 mb-3">
            <Link href="/profile" className="flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username}
                  className="w-9 h-9 rounded-full object-cover border border-indigo-500/30" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-sm text-white uppercase">
                  {user.username?.[0] || "U"}
                </div>
              )}
            </Link>
            <div className="truncate flex-1">
              <p className="text-sm font-semibold text-white truncate">{user.username}</p>
              <p className="text-xs text-gray-500 truncate">@{user.username}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-white/[0.04] hover:border-red-500/20"
          >
            🚪 Logout
          </button>
        </div>
      )}
    </aside>
  );
}
