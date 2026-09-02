import React, { useState } from "react";
import { FaRegComment, FaRegHeart, FaHeart, FaRetweet, FaTrash } from "react-icons/fa";
import { MdArrowOutward, MdMoreHoriz } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import API from "../../config/axios";
import "./Social.css";

const timeAgo = value => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(value).toLocaleDateString();
};

export default function SocialPostCard({ initialPost, onDeleted }) {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const [post, setPost] = useState(initialPost);
  const [showReplies, setShowReplies] = useState(false);
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const liked = post.likes?.some(id => (id._id || id).toString() === currentUser?._id);
  const reposted = post.reposts?.some(id => (id._id || id).toString() === currentUser?._id);
  const isOwn = post.author?._id === currentUser?._id;
  const avatar = post.author?.avatar || post.author?.profilePicture;

  const toggleLike = async () => {
    const res = await API.put(`/social/posts/${post._id}/like`);
    setPost(current => ({ ...current, likes: res.data.likes }));
  };

  const toggleRepost = async () => {
    const res = await API.put(`/social/posts/${post._id}/repost`);
    setPost(current => ({ ...current, reposts: res.data.reposts }));
  };

  const submitReply = async event => {
    event.preventDefault();
    if (!reply.trim()) return;
    setReplying(true);
    try {
      const res = await API.post(`/social/posts/${post._id}/comments`, { text: reply.trim() });
      setPost(res.data);
      setReply("");
      setShowReplies(true);
    } finally {
      setReplying(false);
    }
  };

  const deletePost = async () => {
    await API.delete(`/social/posts/${post._id}`);
    onDeleted?.(post._id);
  };

  return (
    <article className="socialPostCard">
      <div className="socialPostAvatar socialAvatar" onClick={() => navigate(`/profile/${post.author?.username}`)}>
        {avatar ? <img src={avatar} alt="" /> : (post.author?.username || "U").charAt(0).toUpperCase()}
      </div>
      <div className="socialPostBody">
        <header className="socialPostHeader">
          <button onClick={() => navigate(`/profile/${post.author?.username}`)}>{post.author?.username || "Reader"}</button>
          <span>· {timeAgo(post.createdAt)}</span>
          <span className={`socialPostKind socialPostKind-${post.kind}`}>{post.kind}</span>
          {isOwn ? (
            <button className="socialPostDelete" onClick={deletePost} aria-label="Delete post"><FaTrash /></button>
          ) : <MdMoreHoriz className="socialPostMore" />}
        </header>

        {post.channel && (
          <button className="socialChannelContext" onClick={() => navigate(`/groups/${post.channel._id}`)}>
            {post.channel.emoji} in {post.channel.name} <MdArrowOutward />
          </button>
        )}
        <p className={post.kind === "quote" ? "socialPostText socialPostQuote" : "socialPostText"}>{post.text}</p>

        {post.book && (
          <button className="socialBookCard" onClick={() => navigate(`/book/${post.book._id}`)}>
            {post.book.cover && <img src={post.book.cover} alt="" />}
            <span><small>Attached story</small><strong>{post.book.title}</strong><em>by {post.book.authorName}</em></span>
            <MdArrowOutward />
          </button>
        )}

        <div className="socialPostActions">
          <button className={showReplies ? "active" : ""} onClick={() => setShowReplies(!showReplies)}>
            <FaRegComment /> {post.comments?.length || 0}
          </button>
          <button className={reposted ? "reposted" : ""} onClick={toggleRepost}>
            <FaRetweet /> {post.reposts?.length || 0}
          </button>
          <button className={liked ? "liked" : ""} onClick={toggleLike}>
            {liked ? <FaHeart /> : <FaRegHeart />} {post.likes?.length || 0}
          </button>
        </div>

        {showReplies && (
          <div className="socialReplies">
            {(post.comments || []).map(comment => {
              const replyAvatar = comment.user?.avatar || comment.user?.profilePicture;
              return (
                <div className="socialReply" key={comment._id}>
                  <div className="socialAvatar socialAvatarSmall">
                    {replyAvatar ? <img src={replyAvatar} alt="" /> : (comment.user?.username || "R").charAt(0).toUpperCase()}
                  </div>
                  <p><strong>{comment.user?.username || "Reader"}</strong>{comment.text}</p>
                </div>
              );
            })}
            <form className="socialReplyComposer" onSubmit={submitReply}>
              <input value={reply} onChange={event => setReply(event.target.value)} placeholder="Write a reply…" maxLength={500} />
              <button type="submit" disabled={!reply.trim() || replying}>{replying ? "…" : "Reply"}</button>
            </form>
          </div>
        )}
      </div>
    </article>
  );
}
