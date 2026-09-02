import React, { useEffect, useState } from "react";
import { FaBookOpen, FaPaperPlane } from "react-icons/fa";
import { MdFormatQuote, MdLightbulbOutline, MdOutlineQuestionAnswer, MdTrendingUp } from "react-icons/md";
import API from "../../config/axios";
import "./Social.css";

const POST_KINDS = [
  { id: "thought", label: "Thought", icon: MdLightbulbOutline },
  { id: "progress", label: "Progress", icon: MdTrendingUp },
  { id: "quote", label: "Excerpt", icon: MdFormatQuote },
  { id: "question", label: "Question", icon: MdOutlineQuestionAnswer },
];

export default function SocialComposer({ channelId = null, placeholder, onCreated }) {
  const user = JSON.parse(localStorage.getItem("user"));
  const [text, setText] = useState("");
  const [kind, setKind] = useState("thought");
  const [book, setBook] = useState("");
  const [books, setBooks] = useState([]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/books/mine").then(res => setBooks(res.data || [])).catch(() => setBooks([]));
  }, []);

  const submitPost = async event => {
    event.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    setError("");
    try {
      const res = await API.post("/social/posts", {
        text: text.trim(),
        kind,
        book: book || null,
        channel: channelId,
      });
      setText("");
      setBook("");
      setKind("thought");
      onCreated?.(res.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Your post could not be published.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <form className="socialComposer" onSubmit={submitPost}>
      <div className="socialComposerTop">
        <div className="socialAvatar socialAvatarLarge">
          {user?.avatar || user?.profilePicture
            ? <img src={user.avatar || user.profilePicture} alt="" />
            : (user?.username || "U").charAt(0).toUpperCase()}
        </div>
        <textarea
          value={text}
          onChange={event => setText(event.target.value.slice(0, 1200))}
          placeholder={placeholder || "Share a thought, writing update, quote, or question…"}
          rows={3}
        />
      </div>
      <div className="socialComposerKinds" aria-label="Post type">
        {POST_KINDS.map(option => {
          const Icon = option.icon;
          return (
            <button key={option.id} type="button" className={kind === option.id ? "active" : ""} onClick={() => setKind(option.id)}>
              <Icon /> {option.label}
            </button>
          );
        })}
      </div>
      <div className="socialComposerFooter">
        <label className="socialBookAttach">
          <FaBookOpen />
          <select value={book} onChange={event => setBook(event.target.value)}>
            <option value="">No book attached</option>
            {books.map(project => <option key={project._id} value={project._id}>{project.title}</option>)}
          </select>
        </label>
        <span className={text.length > 1100 ? "socialCharCount nearLimit" : "socialCharCount"}>{text.length}/1200</span>
        <button className="socialPublishBtn" type="submit" disabled={!text.trim() || posting}>
          <FaPaperPlane /> {posting ? "Posting…" : "Post"}
        </button>
      </div>
      {error && <p className="socialComposerError">{error}</p>}
    </form>
  );
}
