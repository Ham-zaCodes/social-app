"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import messageService from "@/services/messageService";

function Avatar({ username, avatarUrl, size = "md" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm" };
  if (avatarUrl)
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`${sizes[size]} rounded-full object-cover flex-shrink-0`}
      />
    );
  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white uppercase flex-shrink-0`}
    >
      {username?.[0] || "U"}
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Single tick = sent, Double tick gray = delivered, Double tick blue = read
function Ticks({ isRead }) {
  if (isRead) {
    // Double tick — blue (read)
    return (
      <span className="inline-flex items-center ml-1" title="Read">
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path
            d="M1 5l3 3 5-6"
            stroke="#60a5fa"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6 5l3 3 5-6"
            stroke="#60a5fa"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  // Single tick — gray (sent, not read yet)
  return (
    <span className="inline-flex items-center ml-1" title="Sent">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M1 5l3 3 5-6"
          stroke="#6b7280"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mutuals, setMutuals] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsgIds, setNewMsgIds] = useState(new Set());
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const bottomRef = useRef();
  const roomIdRef = useRef(null);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  // Initial fetch
  useEffect(() => {
    if (!user) return;

    const loadInitialData = async () => {
      try {
        const mutualsData = await messageService.getMutualFollows(user.id);
        setMutuals(mutualsData || []);
      } catch (_) {}

      try {
        const roomsData = await messageService.getRooms();
        setRooms(roomsData || []);
      } catch (_) {}
    };

    loadInitialData();
  }, [user?.id]);

  useEffect(() => {
    const targetUsername = searchParams.get("user");
    if (!targetUsername || !user || (!mutuals.length && !rooms.length)) return;

    const matchingMutual = mutuals.find((m) => m.username === targetUsername);
    if (matchingMutual) {
      openChat(matchingMutual);
      return;
    }

    const matchingRoom = rooms.find(
      (r) => r.recipient_username === targetUsername,
    );
    if (matchingRoom) {
      openRoomChat(matchingRoom);
    }
  }, [searchParams, user?.id, mutuals, rooms]);

  const refreshRoomData = async (roomIdToLoad = roomIdRef.current) => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    try {
      if (!roomIdToLoad) {
        const roomsData = await messageService.getRooms();
        setRooms(roomsData || []);
        return;
      }

      const [roomsData, msgs] = await Promise.all([
        messageService.getRooms(),
        messageService.getRoomMessages(roomIdToLoad),
      ]);

      setRooms(roomsData || []);
      setMessages((prev) => {
        if ((msgs || []).length > prev.length) {
          const newIds = msgs.slice(prev.length).map((m) => m.id);
          setNewMsgIds((prevIds) => new Set([...prevIds, ...newIds]));
          setTimeout(() => {
            setNewMsgIds((prevIds) => {
              const updated = new Set(prevIds);
              newIds.forEach((id) => updated.delete(id));
              return updated;
            });
          }, 3000);
        }
        return msgs || [];
      });
      setRateLimited(false);
    } catch (error) {
      if (error?.response?.status === 429) {
        setRateLimited(true);
      }
    } finally {
      refreshInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!user) return;
    refreshRoomData();
  }, [user?.id]);

  useEffect(() => {
    if (!roomId) return;
    refreshRoomData(roomId);
  }, [roomId]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openChat = async (chatUser) => {
    setSelectedUser(chatUser);
    setMessages([]);
    setNewMsgIds(new Set());
    setLoadingMessages(true);
    const existingRoom = rooms.find(
      (r) => r.recipient_username === chatUser.username,
    );
    if (existingRoom) {
      setRoomId(existingRoom.room_id);
      try {
        const msgs = await messageService.getRoomMessages(existingRoom.room_id);
        setMessages(msgs || []);
        await messageService.getRooms();
      } catch (_) {}
    } else {
      setRoomId(null);
    }
    setLoadingMessages(false);
  };

  const openRoomChat = async (room) => {
    const chatUser = {
      id: room.recipient_id,
      username: room.recipient_username,
      avatar_url: room.recipient_avatar,
    };
    setSelectedUser(chatUser);
    setMessages([]);
    setNewMsgIds(new Set());
    setLoadingMessages(true);
    setRoomId(room.room_id);
    try {
      const msgs = await messageService.getRoomMessages(room.room_id);
      setMessages(msgs || []);
      await messageService.getRooms();
    } catch (_) {}
    setLoadingMessages(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedUser) return;
    setSending(true);
    try {
      const msg = await messageService.sendMessage(
        selectedUser.id,
        text.trim(),
      );
      setMessages((prev) => [...prev, msg]);
      setText("");
      if (!roomId) {
        setRoomId(msg.room_id);
        const updatedRooms = await messageService.getRooms();
        setRooms(updatedRooms || []);
      }
    } catch (_) {
    } finally {
      setSending(false);
    }
  };

  const roomUsernames = new Set(rooms.map((r) => r.recipient_username));
  const mutualNotInRooms = mutuals.filter(
    (m) => !roomUsernames.has(m.username),
  );

  return (
    <main className="flex-1 flex min-h-screen pt-4 pb-24 lg:pt-8 lg:pb-4 gap-0 max-w-4xl">
      {!selectedUser ? (
        <div className="w-full flex flex-col gap-1">
          <h1 className="text-xl font-bold text-white tracking-tight mb-4 pb-4 border-b border-white/[0.06]">
            Messages
          </h1>

          {rooms.map((room) => (
            <button
              key={room.room_id}
              onClick={() => openRoomChat(room)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all w-full ${
                selectedUser?.username === room.recipient_username
                  ? "bg-indigo-500/20 border border-indigo-500/30"
                  : room.unread_count > 0
                    ? "bg-indigo-500/[0.08] border border-indigo-500/20 hover:bg-indigo-500/[0.12]"
                    : "hover:bg-white/[0.04] border border-transparent"
              }`}
            >
              <div className="relative">
                <Avatar
                  username={room.recipient_username}
                  avatarUrl={room.recipient_avatar}
                  size="sm"
                />
                {room.unread_count > 0 &&
                  selectedUser?.username !== room.recipient_username && (
                    <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {room.unread_count > 9 ? "9+" : room.unread_count}
                    </span>
                  )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm font-semibold truncate ${room.unread_count > 0 ? "text-white" : "text-gray-300"}`}
                  >
                    @{room.recipient_username}
                  </p>
                  {room.last_message_time && (
                    <p
                      className={`text-[10px] flex-shrink-0 ml-1 ${room.unread_count > 0 ? "text-indigo-400" : "text-gray-600"}`}
                    >
                      {timeAgo(room.last_message_time)}
                    </p>
                  )}
                </div>
                {room.last_message && (
                  <p
                    className={`text-xs truncate ${room.unread_count > 0 ? "text-gray-300 font-medium" : "text-gray-500"}`}
                  >
                    {room.last_message}
                  </p>
                )}
              </div>
            </button>
          ))}

          {mutualNotInRooms.length > 0 && (
            <>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest px-3 mt-3 mb-1">
                New Chat
              </p>
              {mutualNotInRooms.map((m) => (
                <button
                  key={m.id}
                  onClick={() => openChat(m)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all w-full ${
                    selectedUser?.username === m.username
                      ? "bg-indigo-500/20 border border-indigo-500/30"
                      : "hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <Avatar
                    username={m.username}
                    avatarUrl={m.avatar_url}
                    size="sm"
                  />
                  <p className="text-sm font-semibold text-white truncate">
                    @{m.username}
                  </p>
                </button>
              ))}
            </>
          )}

          {rooms.length === 0 && mutuals.length === 0 && (
            <p className="text-xs text-gray-600 text-center mt-8 px-4">
              Follow someone and get followed back to start chatting.
            </p>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col px-0 lg:pl-4">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-white/[0.06]">
            <button
              onClick={() => {
                setSelectedUser(null);
                setRoomId(null);
                setMessages([]);
              }}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all flex-shrink-0"
              title="Back to messages"
            >
              ←
            </button>
            <Avatar
              username={selectedUser.username}
              avatarUrl={selectedUser.avatar_url}
              size="md"
            />
            <p className="text-sm font-bold text-white">
              @{selectedUser.username}
            </p>
          </div>

          {rateLimited && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Messaging is temporarily paused because the server rate limit was
              reached. Please try again in a few minutes.
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[calc(100vh-280px)]">
            {loadingMessages ? (
              <p className="text-xs text-gray-600 text-center py-8">
                Loading...
              </p>
            ) : messages.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-8">
                No messages yet. Say hi! 👋
              </p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                const isNew = newMsgIds.has(msg.id);
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? "items-end" : "items-start"} ${isNew ? "animate-pulse-once" : ""}`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm transition-all duration-500 ${
                        isMine
                          ? "bg-indigo-500 text-white rounded-br-sm"
                          : isNew
                            ? "bg-emerald-500/20 border border-emerald-500/40 text-gray-100 rounded-bl-sm shadow-lg shadow-emerald-500/10"
                            : "bg-white/[0.06] text-gray-200 rounded-bl-sm"
                      }`}
                    >
                      {msg.message_text}
                    </div>
                    <div
                      className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <p className="text-[10px] text-gray-600">
                        {formatTime(msg.created_at)}
                      </p>
                      {isMine && <Ticks isRead={msg.is_read} />}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="flex gap-2 mt-4 pt-4 border-t border-white/[0.06]"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Message @${selectedUser.username}...`}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            >
              {sending ? "..." : "Send"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
