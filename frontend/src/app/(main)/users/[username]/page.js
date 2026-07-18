"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/services/api";
import userService from "@/services/userService";
import PostCard from "@/components/posts/PostCard";

export default function UserProfilePage() {
  const { username } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!username) return;
    apiClient
      .get(`/users/profile/${username}`)
      .then((res) => {
        setProfile(res.data.user);
        setPosts(res.data.posts || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [username]);

  const handleFollow = async () => {
    if (!profile) return;
    setToggling(true);
    try {
      const res = await userService.toggleFollow(profile.id);
      setFollowing(res.followed);
      setProfile((prev) => ({
        ...prev,
        followers_count: res.followed
          ? prev.followers_count + 1
          : prev.followers_count - 1,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <main className="flex-1 min-h-screen pt-8 pb-16">
        <p className="text-sm text-gray-500">Loading profile...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex-1 min-h-screen pt-8 pb-16">
        <p className="text-sm text-red-400">User not found.</p>
      </main>
    );
  }

  const isOwnProfile = currentUser?.username === profile.username;

  return (
    <main className="flex-1 max-w-2xl min-h-screen pt-8 pb-16">
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="w-16 h-16 rounded-full object-cover border-2 border-indigo-500/40"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-black text-2xl text-white uppercase">
                {profile.username?.[0]}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">{profile.username}</h2>
              <p className="text-sm text-gray-500">@{profile.username}</p>
              {profile.bio && <p className="text-sm text-gray-400 mt-1">{profile.bio}</p>}
              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                <span><span className="text-white font-semibold">{profile.posts_count || 0}</span> Posts</span>
                <span><span className="text-white font-semibold">{profile.followers_count || 0}</span> Followers</span>
                <span><span className="text-white font-semibold">{profile.following_count || 0}</span> Following</span>
              </div>
            </div>
          </div>
          {!isOwnProfile && (
            <button
              onClick={handleFollow}
              disabled={toggling}
              className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                following
                  ? "bg-white/10 text-gray-300 hover:bg-red-500/10 hover:text-red-400"
                  : "bg-indigo-500 hover:bg-indigo-600 text-white"
              }`}
            >
              {toggling ? "..." : following ? "Unfollow" : "Follow"}
            </button>
          )}
        </div>
      </div>

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
              post={{ ...post, author_username: profile.username, author_id: profile.id }}
              currentUserId={currentUser?.id}
            />
          ))
        )}
      </div>
    </main>
  );
}
