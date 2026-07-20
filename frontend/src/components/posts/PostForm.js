"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import apiClient from "@/services/api";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

// Cloudinary par directly image upload karo (unsigned)
const uploadToCloudinary = async (file) => {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error("Image upload is not configured on this site.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "social-app");

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || "Image upload failed");
  }

  if (!data.secure_url) {
    throw new Error("Cloudinary did not return an image URL.");
  }

  return data.secure_url;
};

export default function PostForm({ user, onPostCreated }) {
  const [postText, setPostText] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileRef = useRef();
  const emojiRef = useRef();

  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target))
        setShowEmoji(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImage(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postText.trim()) return;
    setPosting(true);

    try {
      let imageUrl = null;

      // Step 1: Agar image hai to pehle Cloudinary par upload karo
      if (image) {
        setUploadingImage(true);
        imageUrl = await uploadToCloudinary(image);
        setUploadingImage(false);
      }

      // Step 2: Backend ko JSON bhejo — sirf content + image URL
      const { data } = await apiClient.post("/post", {
        content: postText,
        media_url: imageUrl,
      });

      onPostCreated({
        id: data.post.id,
        content: data.post.content,
        image_url: data.post.image_url,
        created_at: data.post.created_at,
        author_id: user.id,
        author_username: user.username,
        author_avatar: user.avatar_url,
        likes_count: 0,
        comments_count: 0,
        liked_by_user: false,
      });

      setPostText("");
      removeImage();
      setShowEmoji(false);
    } catch (error) {
      setUploadingImage(false);
      alert(
        error?.response?.data?.error?.message ||
          error?.message ||
          "Failed to publish post.",
      );
    } finally {
      setPosting(false);
    }
  };

  const isLoading = posting || uploadingImage;
  const buttonText = uploadingImage
    ? "Uploading image..."
    : posting
      ? "Posting..."
      : "Post";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/[0.02] border border-white/[0.06] p-3 sm:p-4 rounded-2xl mb-6 shadow-xl"
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center font-bold text-white uppercase flex-shrink-0">
          {user?.username?.[0] || "U"}
        </div>
        <div className="flex-1">
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="What's on your mind?"
            rows="3"
            className="w-full bg-transparent border-none resize-none text-white placeholder-gray-500 focus:outline-none focus:ring-0 text-sm py-1"
          />

          {preview && (
            <div className="relative mt-2 rounded-xl overflow-hidden border border-white/[0.06]">
              <img
                src={preview}
                alt="preview"
                className="w-full max-h-60 object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg hover:bg-black/80"
              >
                ✕ Remove
              </button>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-white/[0.04] mt-2">
            <div className="flex gap-1 text-indigo-400 relative" ref={emojiRef}>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileRef.current.click()}
                className="hover:bg-white/[0.05] p-1.5 rounded-lg transition-all text-lg"
                title="Upload image"
              >
                🖼️
              </button>
              <button
                type="button"
                onClick={() => setShowEmoji((prev) => !prev)}
                className="hover:bg-white/[0.05] p-1.5 rounded-lg transition-all text-lg"
                title="Add emoji"
              >
                😀
              </button>
              {showEmoji && (
                <div className="absolute bottom-10 left-0 z-50">
                  <EmojiPicker
                    onEmojiClick={(emojiData) =>
                      setPostText((prev) => prev + emojiData.emoji)
                    }
                    theme="dark"
                    height={380}
                    width={300}
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading || !postText.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all disabled:opacity-40"
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
