"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/api";
import PostCard from "@/components/posts/PostCard";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const uploadToCloudinary = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: fd,
    },
  );
  if (!res.ok) throw new Error("Avatar upload failed");
  return (await res.json()).secure_url;
};

// Followers / Following modal
function FollowListModal({ title, users, onClose }) {
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-[#0F1623] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {users.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              No users yet.
            </p>
          ) : (
            users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onClose();
                  router.push(`/users/${u.username}`);
                }}
                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.04] transition-all text-left"
              >
                {u.avatar_url ? (
                  <img
                    src={u.avatar_url}
                    alt={u.username}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-xs text-white uppercase">
                    {u.username?.[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-white">
                    {u.username}
                  </p>
                  {u.bio && (
                    <p className="text-xs text-gray-500 truncate max-w-[180px]">
                      {u.bio}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit profile
  const [editMode, setEditMode] = useState(false);
  const [bioText, setBioText] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarRef = useRef();

  // Followers / Following modal
  const [modal, setModal] = useState(null); // "followers" | "following" | null
  const [modalUsers, setModalUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get(`/users/${user.id}/profile`)
      .then((res) => {
        setProfile(res.data.profile);
        setPosts(res.data.posts || []);
        setBioText(res.data.profile?.bio || "");
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const url = await uploadToCloudinary(file);
      const res = await apiClient.put("/users/profile", { avatar_url: url });
      setProfile((prev) => ({ ...prev, avatar_url: res.data.user.avatar_url }));
      await refreshUser(); // Sidebar avatar bhi update ho
    } catch (err) {
      alert("Avatar upload failed");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveBio = async () => {
    setSaving(true);
    try {
      const res = await apiClient.put("/users/profile", { bio: bioText });
      setProfile((prev) => ({ ...prev, bio: res.data.user.bio }));
      setEditMode(false);
    } catch (err) {
      alert("Failed to save bio");
    } finally {
      setSaving(false);
    }
  };

  const openModal = async (type) => {
    setModal(type);
    setModalLoading(true);
    try {
      const res = await apiClient.get(`/users/${profile.id}/${type}`);
      setModalUsers(res.data[type] || []);
    } catch (err) {
      setModalUsers([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handlePostEdit = (postId, newContent) =>
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, content: newContent } : p)),
    );

  const handlePostDelete = async (postId) => {
    try {
      await apiClient.delete(`/post/${postId}`);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 min-h-screen pt-8 pb-16">
        <p className="text-sm text-gray-500">Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="w-full max-w-2xl min-h-screen pt-4 pb-24 sm:pt-6 lg:pt-8 lg:pb-16">
      {/* Profile Header */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:p-6 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Avatar with upload */}
          <div className="relative flex-shrink-0">
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <button
              onClick={() => avatarRef.current.click()}
              disabled={avatarUploading}
              className="relative group"
              title="Change profile picture"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500/40"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-3xl text-white uppercase">
                  {profile?.username?.[0] || "U"}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-semibold">
                  {avatarUploading ? "..." : "📷"}
                </span>
              </div>
            </button>
          </div>

          <div className="flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {profile?.username}
                </h2>
                <p className="text-sm text-gray-500">@{profile?.username}</p>
              </div>
              <button
                onClick={() => setEditMode((prev) => !prev)}
                className="w-fit text-xs text-gray-400 hover:text-white border border-white/[0.08] px-3 py-1.5 rounded-xl hover:bg-white/[0.04] transition-all"
              >
                {editMode ? "Cancel" : "✏️ Edit Profile"}
              </button>
            </div>

            {/* Bio */}
            {editMode ? (
              <div className="mt-3">
                <textarea
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  rows="2"
                  placeholder="Write your bio..."
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-indigo-500 transition-all"
                />
                <button
                  onClick={handleSaveBio}
                  disabled={saving}
                  className="mt-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold px-4 py-1.5 rounded-xl transition-all disabled:opacity-40"
                >
                  {saving ? "Saving..." : "Save Bio"}
                </button>
              </div>
            ) : (
              profile?.bio && (
                <p className="text-sm text-gray-400 mt-2">{profile.bio}</p>
              )
            )}

            {/* Stats — clickable */}
            <div className="flex flex-wrap gap-4 sm:gap-5 mt-3 text-xs text-gray-500">
              <span>
                <span className="text-white font-semibold">
                  {profile?.posts_count || 0}
                </span>{" "}
                Posts
              </span>
              <button
                onClick={() => openModal("followers")}
                className="hover:text-white transition-colors"
              >
                <span className="text-white font-semibold">
                  {profile?.followers_count || 0}
                </span>{" "}
                Followers
              </button>
              <button
                onClick={() => openModal("following")}
                className="hover:text-white transition-colors"
              >
                <span className="text-white font-semibold">
                  {profile?.following_count || 0}
                </span>{" "}
                Following
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="border-b border-white/[0.06] pb-4 mb-6">
        <h3 className="text-sm font-bold text-white">Posts</h3>
      </div>
      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl p-8 text-center text-gray-500 text-sm">
            No posts yet.
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={{
                ...post,
                author_username: profile?.username,
                author_id: profile?.id,
              }}
              currentUserId={user?.id}
              onEdit={handlePostEdit}
              onDelete={handlePostDelete}
            />
          ))
        )}
      </div>

      {/* Followers / Following Modal */}
      {modal && (
        <FollowListModal
          title={modal === "followers" ? "Followers" : "Following"}
          users={modalLoading ? [] : modalUsers}
          onClose={() => setModal(null)}
        />
      )}
    </main>
  );
}
