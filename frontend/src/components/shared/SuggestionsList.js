"use client";

import { useState, useEffect } from "react";
import userService from "@/services/userService";

export default function SuggestionsList() {
  const [suggestions, setSuggestions] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());

  useEffect(() => {
    userService.getSuggestions().then(setSuggestions).catch(console.error);
  }, []);

  const handleFollow = async (userId) => {
    try {
      const res = await userService.toggleFollow(userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (res.followed) next.add(userId);
        else next.delete(userId);
        return next;
      });
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 shadow-xl">
      <h3 className="text-sm font-bold text-white mb-4 tracking-tight">
        Who to follow
      </h3>
      <div className="space-y-4">
        {suggestions.length === 0 ? (
          <p className="text-xs text-gray-500">No suggestions available.</p>
        ) : (
          suggestions.map((u) => (
            <div key={u.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {u.username[0]}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{u.username}</p>
                  <p className="text-[10px] text-gray-500">@{u.username}</p>
                </div>
              </div>
              <button
                onClick={() => handleFollow(u.id)}
                className={`font-semibold text-[11px] px-3 py-1 rounded-full transition-all ${
                  followingIds.has(u.id)
                    ? "bg-white/10 text-gray-400 hover:bg-red-500/10 hover:text-red-400"
                    : "bg-white text-black hover:bg-gray-200"
                }`}
              >
                {followingIds.has(u.id) ? "Unfollow" : "Follow"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
