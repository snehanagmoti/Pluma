import React, { useState, useEffect } from "react";
import "./Feed.css";
import BookCard from "../bookCard/BookCard";
import API from "../../config/axios";
import { FaFire, FaClockRotateLeft, FaWandMagicSparkles } from "react-icons/fa6";

const FALLBACK_GENRES = [
  { name: "Fantasy" }, { name: "Romance" }, { name: "Sci-Fi" },
  { name: "Mystery" }, { name: "Thriller" }, { name: "Adventure" },
  { name: "Horror" }, { name: "Poetry" }
];

export default function Feed({ query }) {
  const [books, setBooks] = useState([]);
  const [genres, setGenres] = useState(FALLBACK_GENRES);
  const [activeGenre, setActiveGenre] = useState("all");
  const [activeTab, setActiveTab] = useState("foryou");
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchFeedData = async () => {
      setLoading(true);
      try {
        let fetchedBooks = [];
        if (activeTab === "foryou") {
          const response = await API.get("/recommendations?mode=personalized&limit=32");
          fetchedBooks = response.data.books || [];
        } else if (activeTab === 'trending') {
          const response = await API.get("/recommendations?mode=trending&limit=32");
          fetchedBooks = response.data.books || [];
        } else {
          const [community, catalog] = await Promise.all([API.get("/books/all?limit=24"), API.get("/catalog/featured")]);
          fetchedBooks = [...(community.data || []), ...(catalog.data.books || []).slice(0, 8)];
        }
        const genreNames = [...new Set(fetchedBooks.flatMap(book => book.genres || []).map(value => String(value).toLowerCase()))].slice(0, 12);
        setGenres(genreNames.length ? genreNames.map(name => ({ name })) : FALLBACK_GENRES);
        setBooks(fetchedBooks);
      } catch (err) {
        console.error("Feed error:", err);
        setBooks([]);
      }
      setLoading(false);
    };

    fetchFeedData();
  }, [activeTab]); // Fetch when tab changes

  // Filter books based on search query, genre, and active tab
  const filteredBooks = books.filter(book => {
    const matchesSearch = !query ||
      book.title?.toLowerCase().includes(query.toLowerCase()) ||
      book.authorName?.toLowerCase().includes(query.toLowerCase()) ||
      book.genres?.some(g => g.toLowerCase().includes(query.toLowerCase()));

    const matchesGenre = activeGenre === "all" ||
      book.genres?.some(g => g.toLowerCase() === activeGenre.toLowerCase());

    return matchesSearch && matchesGenre;
  });

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="feed">
      <div className="feedWrapper">

        {/* Welcome Section */}
        <div className="feedWelcome">
          <h1 className="feedTitle">
            {getGreeting()}, <span className="gradient-text">{user?.username}</span>
          </h1>
          <p className="feedSubtitle">Ready to dive into a new world today?</p>
        </div>

        {/* Filters & Tags */}
        <div className="feedFilters">
          <div className="feedTabs">
            <button
              className={`feedTab ${activeTab === 'foryou' ? 'active' : ''}`}
              onClick={() => setActiveTab('foryou')}
            >
              <FaWandMagicSparkles /> For You
            </button>
            <button
              className={`feedTab ${activeTab === 'trending' ? 'active' : ''}`}
              onClick={() => setActiveTab('trending')}
            >
              <FaFire /> Trending
            </button>
            <button
              className={`feedTab ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              <FaClockRotateLeft /> Recent
            </button>
          </div>

          <div className="genreChips">
            <button
              className={`genreChip ${activeGenre === 'all' ? 'active' : ''}`}
              onClick={() => setActiveGenre('all')}
            >
              All
            </button>
            {genres.slice(0, 8).map(g => (
              <button
                key={g.name}
                className={`genreChip ${activeGenre === g.name ? 'active' : ''}`}
                onClick={() => setActiveGenre(g.name)}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="feedContent">
          {loading ? (
            // Skeleton loaders
            Array.from({ length: 8 }).map((_, i) => (
              <div key={`skel-${i}`} className="bookCardSkeleton">
                <div className="skeleton skel-img"></div>
                <div className="skeleton skel-title"></div>
                <div className="skeleton skel-text"></div>
                <div className="skeleton skel-tags"></div>
              </div>
            ))
          ) : filteredBooks.length > 0 ? (
            filteredBooks.map((book, i) => (
              <div key={book._id} className="feedAnimItem" style={{ animationDelay: `${i * 0.05}s` }}>
                <BookCard book={book} />
              </div>
            ))
          ) : (
            <div className="feedEmpty">
              <h2>No books found.</h2>
              <p>Try another genre, browse the real-book catalog, or start a story of your own.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
