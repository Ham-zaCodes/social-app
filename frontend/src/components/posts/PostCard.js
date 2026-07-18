"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import postService from "@/services/postService";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

function Avatar({ username, avatarUrl, size = "md" }) {
  const sizes = { sm: "w-7 h-7 text-[10px]", md: "w-9 h-9 text-xs" };
  if (avatarUrl)
    return <img src={avatarUrl} alt={username} className={`${sizes[size]} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white uppercase flex-shrink-0`}>
      {username?.[0] || "U"}
    </div>
  );
}

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const LIMIT = 200;

export default function PostCard({ post, currentUserId, onDelete, onEdit }) {
  const [likes, setLikes] = useState(post.likes_count || 0);
  const [liked, setLiked] = useState(post.liked_by_user || false);
  const [liking, setLiking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isLong = post.content?.length > LIMIT;

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments_count || 0);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showCommentEmoji, setShowCommentEmoji] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showEditEmoji, setShowEditEmoji] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef();
  const commentEmojiRef = useRef();
  const editEmojiRef = useRef();
  const isOwner = currentUserId === post.author_id;

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
      if (commentEmojiRef.current && !commentEmojiRef.current.contains(e.target)) setShowCommentEmoji(false);
      if (editEmojiRef.current && !editEmojiRef.current.contains(e.target)) setShowEditEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((prev) => (wasLiked ? prev - 1 : prev + 1));
    try { await postService.toggleLike(post.id); }
    catch { setLiked(wasLiked); setLikes((prev) => (wasLiked ? prev + 1 : prev - 1)); }
    finally { setLiking(false); }
  };

  const handleToggleComments = async () => {
    setShowComments((prev) => !prev);
    if (!commentsLoaded) {
      try {
        const data = await postService.getComments(post.id);
        setComments(data);
        setCommentsLoaded(true);
      } catch (err) { console.error(err); }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const data = await postService.addComment(post.id, commentText);
      setComments((prev) => [...prev, data.comment]);
      setCommentCount((prev) => prev + 1);
      setCommentText("");
      setShowCommentEmoji(false);
    } catch (err) { console.error(err); }
    finally { setSubmittingComment(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await postService.deleteComment(post.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentCount((prev) => prev - 1);
    } catch (err) { console.error(err); }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setSavingEdit(true);
    try {
      const data = await postService.editPost(post.id, editText);
      onEdit(post.id, data.post.content);
      setEditing(false);
      setShowEditEmoji(false);
    } catch (err) { console.error(err); }
    finally { setSavingEdit(false); }
  };

  return (
    <article className="bg-white/[0.02] border border-white/[0.06] rounded-2xl hover:border-white/[0.1] transition-all overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <Link href={`/users/${post.author_username}`} className="flex items-center gap-2.5 group">
          <Avatar username={post.author_username} avatarUrl={post.author_avatar} size="md" />
          <div>
            <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors leading-tight">
              {post.author_username || "User"}
            </p>
            <p className="text-[11px] text-gray-500 leading-tight">
              @{post.author_username} · {timeAgo(post.created_at)}
            </p>
          </div>
        </Link>

        {isOwner && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu((p) => !p)}
              className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all text-lg leading-none"
            >
              ···
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-[#0d1117] border border-white/[0.08] rounded-xl shadow-2xl z-30 overflow-hidden min-w-[130px]">
                <button
                  onClick={() => { setEditing(true); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-300 hover:text-white hover:bg-white/[0.06] transition-all"
                >
                  ✏️ Edit Post
                </button>
                <button
                  onClick={() => { onDelete(post.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                >
                  🗑️ Delete Post
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-2">
        <p className="text-[13.5px] text-gray-200 leading-relaxed whitespace-pre-wrap">
          {isLong && !expanded ? post.content.slice(0, LIMIT) + "…" : post.content}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-xs text-indigo-400 hover:text-indigo-300 mt-0.5 transition-colors"
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>

      {/* Image */}
      {post.image_url && (
        <div className="mx-4 mb-2 overflow-hidden rounded-xl border border-white/[0.05]">
          <img src={post.image_url} alt="Post" className="w-full max-h-72 object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-5 px-4 py-2 border-t border-white/[0.04]">
        <button
          onClick={handleLike}
          disabled={liking}
          className={`flex items-center gap-1.5 text-xs transition-colors ${liked ? "text-red-400" : "text-gray-500 hover:text-red-400"}`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span>{likes}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-400 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="px-4 pb-3 space-y-2 border-t border-white/[0.04] pt-3">
          {comments.length === 0 && (
            <p className="text-xs text-gray-600 text-center py-1">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 group">
              <Link href={`/users/${c.username}`} className="flex-shrink-0 mt-0.5">
                <Avatar username={c.username} avatarUrl={c.avatar_url} size="sm" />
              </Link>
              <div className="bg-white/[0.03] rounded-xl px-3 py-1.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/users/${c.username}`} className="text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 transition-colors">
                    @{c.username}
                  </Link>
                  {currentUserId === c.user_id && (
                    <button onClick={() => handleDeleteComment(c.id)}
                      className="text-[10px] text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                      🗑️
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-300 mt-0.5 leading-snug">{c.content}</p>
              </div>
            </div>
          ))}

          <form onSubmit={handleAddComment} className="flex gap-2 mt-1 relative" ref={commentEmojiRef}>
            <div className="flex-1 flex items-center bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 focus-within:border-indigo-500 transition-all">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
              />
              <button type="button" onClick={() => setShowCommentEmoji((p) => !p)}
                className="text-gray-500 hover:text-yellow-400 transition-colors ml-1">😊</button>
            </div>
            <button type="submit" disabled={submittingComment || !commentText.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40">
              {submittingComment ? "..." : "Send"}
            </button>
            {showCommentEmoji && (
              <div className="absolute bottom-10 left-0 z-50">
                <EmojiPicker onEmojiClick={(e) => setCommentText((p) => p + e.emoji)}
                  theme="dark" height={300} width={270} skinTonesDisabled previewConfig={{ showPreview: false }} />
              </div>
            )}
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#0d1117] border border-white/[0.08] rounded-2xl p-5 w-full max-w-lg shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-3">Edit Post</h3>
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows="4"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-indigo-500 transition-all" />
            <div className="relative mt-1.5" ref={editEmojiRef}>
              <button type="button" onClick={() => setShowEditEmoji((p) => !p)}
                className="text-gray-500 hover:text-yellow-400 transition-colors text-xs">😊 Add Emoji</button>
              {showEditEmoji && (
                <div className="absolute bottom-7 left-0 z-50">
                  <EmojiPicker onEmojiClick={(e) => setEditText((p) => p + e.emoji)}
                    theme="dark" height={300} width={270} skinTonesDisabled previewConfig={{ showPreview: false }} />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => { setEditing(false); setEditText(post.content); setShowEditEmoji(false); }}
                className="px-4 py-1.5 text-xs text-gray-400 hover:text-white rounded-xl hover:bg-white/[0.04] transition-all">
                Cancel
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit || !editText.trim()}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40">
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
