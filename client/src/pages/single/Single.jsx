import React, { useState, useEffect, useMemo } from "react";
import "./Single.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import VoiceReader from "../../components/voiceReader/VoiceReader";
import TranslatePanel from "../../components/translatePanel/TranslatePanel";
import API from "../../config/axios";
import { useParams, useNavigate } from "react-router-dom";
import { FaHeart, FaRegHeart, FaBookmark, FaRegBookmark, FaStar, FaChevronLeft, FaChevronRight, FaBookOpen } from "react-icons/fa";
import { MdTranslate } from "react-icons/md";
import { HiMinus, HiPlus } from "react-icons/hi";
import SafeRichText from "../../components/safeRichText/SafeRichText";

export default function Single() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeChapter, setActiveChapter] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isMarkedRead, setIsMarkedRead] = useState(false);

  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "null"), []);
  const libraryHasBook = useMemo(() => user?.library?.some(id => String(id?._id || id) === bookId) || false, [bookId, user]);

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await API.get(`/books/${bookId}`);
        setBook(res.data);
        setIsInLibrary(libraryHasBook);
        setIsLiked(res.data.likes?.some(id => String(id) === user?._id));
      } catch (err) {
        console.error("Error fetching book:", err);
      }
      setLoading(false);
    };
    fetchBook();
  }, [bookId, libraryHasBook, user?._id]);

  // Track reading progress via scroll
  useEffect(() => {
    const handleScroll = () => {
      const el = document.querySelector('.singleContent');
      if (!el) return;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      setReadingProgress(progress);
    };
    const el = document.querySelector('.singleContent');
    el?.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, [activeChapter]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await API.post(`/books/${bookId}/comment`, { text: commentText });
      setBook(res.data);
      setCommentText("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleMarkRead = async () => {
    if (isMarkedRead) return;
    try {
      await API.put(`/reading/${bookId}`, { chapterIndex: Math.max(0, (book?.chapters?.length || 1) - 1), scrollPercent: 100, completed: true });
      setIsMarkedRead(true);
      alert("Book marked as read! Your reading stats have been updated.");
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleLike = async () => {
    try {
      await API.put(`/books/${bookId}/like`);
      setIsLiked(!isLiked);
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleAddToLibrary = async () => {
    try {
      await API.post("/library", { bookId });
      setIsInLibrary(true);
      // Update local user data
      const updated = { ...user, library: [...(user.library || []), bookId] };
      localStorage.setItem("user", JSON.stringify(updated));
    } catch (err) {
      console.error("Library error:", err);
    }
  };

  const currentChapter = book?.chapters?.[activeChapter];

  if (loading) {
    return (
      <>
        <Topbar />
        <div className="singlePage">
          <div className="singleLoading">
            <div className="skeleton" style={{ width: "60%", height: "36px", marginBottom: "16px" }}></div>
            <div className="skeleton" style={{ width: "40%", height: "20px", marginBottom: "40px" }}></div>
            <div className="skeleton" style={{ width: "100%", height: "400px" }}></div>
          </div>
        </div>
      </>
    );
  }

  if (!book) {
    return (
      <>
        <Topbar />
        <div className="singlePage">
          <div className="singleEmpty">
            <h2>Book not found</h2>
            <button className="btn-primary" onClick={() => navigate("/")}>Go Home</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar />
      <div className="singlePage">
        <Sidebar />
        <div className="singleMain">
          {/* Reading Progress Bar */}
          <div className="readingProgressBar">
            <div className="readingProgressFill" style={{ width: `${readingProgress}%` }}></div>
          </div>

          {/* Book Header */}
          <div className="singleHeader">
            <div className="singleHeaderLeft">
              <img
                className="singleCover"
                src={book.cover || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400"}
                alt={book.title}
              />
            </div>
            <div className="singleHeaderRight">
              <h1 className="singleTitle">{book.title}</h1>
              <span className="singleAuthor" onClick={() => navigate(`/profile/${book.authorName}`)}>
                by {book.authorName}
              </span>
              <p className="singleDesc">{book.desc}</p>

              <div className="singleGenres">
                {book.genres?.map((g, i) => (
                  <span key={i} className="singleGenreTag">{g}</span>
                ))}
              </div>

              <div className="singleStats">
                <div className="singleStatItem">
                  <FaStar style={{ color: "#e9ac32" }} />
                  <span>{book.rating?.toFixed(1) || "0.0"}</span>
                </div>
                <div className="singleStatItem">
                  <span>{book.chapters?.length || 0} Chapters</span>
                </div>
                <div className="singleStatItem">
                  <span>{book.views || 0} Views</span>
                </div>
              </div>

              <div className="singleActions">
                <button className="singleActionBtn singleReadBtn" onClick={() => navigate(`/reader/${bookId}`)}>
                  <FaBookOpen />
                  <span>Read full screen</span>
                </button>
                <button className={`singleActionBtn ${isLiked ? 'liked' : ''}`} onClick={handleLike}>
                  {isLiked ? <FaHeart /> : <FaRegHeart />}
                  <span>{isLiked ? "Liked" : "Like"}</span>
                </button>
                <button className={`singleActionBtn ${isInLibrary ? 'saved' : ''}`} onClick={handleAddToLibrary}>
                  {isInLibrary ? <FaBookmark /> : <FaRegBookmark />}
                  <span>{isInLibrary ? "In Library" : "Add to Library"}</span>
                </button>
                <button className="singleActionBtn" onClick={() => setShowTranslate(true)}>
                  <MdTranslate />
                  <span>Translate</span>
                </button>
                <button className={`singleActionBtn ${isMarkedRead ? 'saved' : ''}`} onClick={handleMarkRead}>
                  <FaStar />
                  <span>{isMarkedRead ? "Read" : "Mark as Read"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Reading Controls */}
          <div className="readingControls">
            <div className="fontSizeControl">
              <button onClick={() => setFontSize(prev => Math.max(14, prev - 2))}><HiMinus /></button>
              <span className="fontSizeLabel">Aa</span>
              <button onClick={() => setFontSize(prev => Math.min(28, prev + 2))}><HiPlus /></button>
            </div>
          </div>

          {/* Voice Reader */}
          {currentChapter && <VoiceReader text={currentChapter.content} />}

          {/* Chapter Navigation */}
          {book.chapters?.length > 0 && (
            <div className="chapterNav">
              <div className="chapterTabs">
                {book.chapters.map((ch, i) => (
                  <button
                    key={i}
                    className={`chapterTab ${activeChapter === i ? 'active' : ''}`}
                    onClick={() => setActiveChapter(i)}
                  >
                    {ch.title || `Chapter ${i + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chapter Content */}
          <div className="singleContent" style={{ fontSize: `${fontSize}px` }}>
            {currentChapter ? (
              <>
                <h2 className="chapterTitle">{currentChapter.title || `Chapter ${activeChapter + 1}`}</h2>
                  <SafeRichText html={currentChapter.content} className="chapterText" />
              </>
            ) : (
              <div className="noChapters">
                <p>No chapters available yet.</p>
              </div>
            )}
          </div>

          {/* Chapter Prev / Next */}
          {book.chapters?.length > 1 && (
            <div className="chapterPrevNext">
              <button
                className="chapterNavBtn"
                disabled={activeChapter === 0}
                onClick={() => setActiveChapter(prev => prev - 1)}
              >
                <FaChevronLeft /> Previous
              </button>
              <span className="chapterCounter">
                {activeChapter + 1} / {book.chapters.length}
              </span>
              <button
                className="chapterNavBtn"
                disabled={activeChapter === book.chapters.length - 1}
                onClick={() => setActiveChapter(prev => prev + 1)}
              >
                Next <FaChevronRight />
              </button>
            </div>
          )}

          {/* Comments Section */}
          <div className="commentsSection">
            <h3 className="commentsTitle">Discussions ({book.comments?.length || 0})</h3>

            <form className="commentForm" onSubmit={handleAddComment}>
              <input
                type="text"
                placeholder="Share your thoughts on this book..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                className="commentInput"
              />
              <button type="submit" className="commentSubmitBtn">Post</button>
            </form>

            <div className="commentsList">
              {book.comments?.slice().reverse().map((c, i) => (
                <div key={i} className="commentItem">
                  <div className="commentAvatar">
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="commentBody">
                    <span className="commentUsername">{c.username}</span>
                    <span className="commentDate">{new Date(c.createdAt).toLocaleDateString()}</span>
                    <p className="commentText">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {showTranslate && (
        <TranslatePanel
          text={currentChapter?.content || book.desc || ""}
          onClose={() => setShowTranslate(false)}
        />
      )}
    </>
  );
}
