import React, { useState, useEffect } from "react";
import "./Bookmarks.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import BookCard from "../../components/bookCard/BookCard";
import API from "../../config/axios";
import { FaBookmark, FaSortAmountDown } from "react-icons/fa";

export default function Bookmarks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("recent");

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const response = await API.get("/library");
        setBooks(response.data.items || []);
      } catch (err) {
        console.error("Bookmarks error:", err);
      }
      setLoading(false);
    };
    fetchLibrary();
  }, []);

  const sortedBooks = [...books].sort((a, b) => {
    if (sortBy === "title") return (a.title || "").localeCompare(b.title || "");
    if (sortBy === "author") return (a.authorName || "").localeCompare(b.authorName || "");
    return new Date(b.savedAt || b.createdAt || 0) - new Date(a.savedAt || a.createdAt || 0);
  });

  return (
    <>
      <Topbar />
      <div className="bookmarksPage">
        <Sidebar />
        <div className="bookmarksMain">
          <div className="bookmarksHeader">
            <div className="bookmarksHeaderLeft">
              <FaBookmark className="bookmarksIcon" />
              <h1>Your Library</h1>
            </div>
            <div className="bookmarksSortWrapper">
              <FaSortAmountDown className="sortIcon" />
              <select className="bookmarksSort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="recent">Recently Added</option>
                <option value="title">Title A-Z</option>
                <option value="author">Author A-Z</option>
              </select>
            </div>
          </div>

          <span className="bookmarksCount">{books.length} {books.length === 1 ? "book" : "books"} in your library</span>

          <div className="bookmarksGrid">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bookCardSkeleton">
                  <div className="skeleton" style={{ height: "220px", borderRadius: "12px", marginBottom: "12px" }}></div>
                  <div className="skeleton" style={{ height: "18px", width: "80%", marginBottom: "8px" }}></div>
                  <div className="skeleton" style={{ height: "14px", width: "50%" }}></div>
                </div>
              ))
            ) : sortedBooks.length > 0 ? (
              sortedBooks.map((b, i) => (
                <div key={b._id} className="bookmarkAnimItem" style={{ animationDelay: `${i * 0.06}s` }}>
                  <BookCard book={b} />
                </div>
              ))
            ) : (
              <div className="bookmarksEmpty">
                <div className="bookmarksEmptyIcon">📚</div>
                <h2>Your library is empty</h2>
                <p>Start adding books to your library to see them here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
