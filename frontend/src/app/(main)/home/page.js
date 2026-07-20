"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import postService from "@/services/postService";
import PostCard from "@/components/posts/PostCard";
import PostForm from "@/components/posts/PostForm";
import SuggestionsList from "@/components/shared/SuggestionsList";

export default function HomePage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    postService
      .getAllPosts()
      .then((data) => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setFetchLoading(false));
  }, []);

  const handlePostCreated = (newPost) => setPosts((prev) => [newPost, ...prev]);

  const handleDelete = async (postId) => {
    try {
      await postService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleEdit = (postId, newContent) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, content: newContent } : p)),
    );
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:h-screen lg:min-h-0">
      <main className="w-full max-w-2xl min-h-0 h-full overflow-y-auto pt-4 pb-20 sm:pt-6 lg:pt-8 lg:pb-16">
        <div className="border-b border-white/[0.06] pb-3 mb-4">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Home Feed
          </h1>
        </div>

        <PostForm user={user} onPostCreated={handlePostCreated} />

        <div className="space-y-3">
          {fetchLoading ? (
            <p className="text-center text-sm text-gray-500 py-12">
              Loading your timeline...
            </p>
          ) : posts.length === 0 ? (
            <div className="bg-white/[0.01] border border-white/[0.04] p-5 rounded-2xl text-center text-gray-500 text-sm py-12">
              No posts yet. Create the first one above!
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user?.id}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))
          )}
        </div>
      </main>

      <aside className="w-full lg:sticky lg:top-0 lg:w-80 lg:pt-8 lg:pl-2">
        <SuggestionsList />
      </aside>
    </div>
  );
}
