import React, { useEffect, useState } from "react";
import "./Feed.css";
import BookCard from "../bookCard/BookCard";
import axios from "axios";

export default function Feed({ query }) {
  const [books, setBooks] = useState([]);
  const [library, setLibrary] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState("book");

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const token = localStorage.getItem("token");
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        const res = await axios.get("http://localhost:5000/api/books/public", authHeader);
        setBooks(res.data);

        if (user) {
          const libRes = await axios.get(
            `http://localhost:5000/api/users/${user.id}/library`,
            authHeader
          );
          setLibrary(libRes.data);

          const recRes = await axios.get(
            `http://localhost:5000/api/users/${user.id}/recommendations`,
            authHeader
          );
          setRecommendations(recRes.data);
        }
      } catch (err) {
        console.log("Error fetching feed:", err);
      }
    };
    fetchBooks();
  }, [user?.id]); // Updated dependency here too!

  useEffect(() => {
    const fetchSearch = async () => {
      if (query.length === 0) {
        setSearchResults([]);
        return;
      }
      try {
        const token = localStorage.getItem("token");
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };
        const res = await axios.get(
          `http://localhost:5000/api/books/search?q=${query}&type=${searchType}`,
          authHeader
        );
        setSearchResults(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    const timer = setTimeout(() => { fetchSearch(); }, 500);
    return () => clearTimeout(timer);
  }, [query, searchType]);

  return (
    <div className="feed">
      <div className="feedWrapper">

        {query ? (
          <>
            <div className="searchFilters">
              <span className="filterLabel">Filter results by:</span>

              <label className="radioLabel">
                <input
                  type="radio"
                  name="filter"
                  checked={searchType === "book"}
                  onChange={() => setSearchType("book")}
                />
                <span className="radioText">Title</span>
              </label>

              <label className="radioLabel">
                <input
                  type="radio"
                  name="filter"
                  checked={searchType === "author"}
                  onChange={() => setSearchType("author")}
                />
                <span className="radioText">Author</span>
              </label>
            </div>

            <div className="feedSection">
              <h2 className="feedTitle">Search Results for "{query}"</h2>
              <div className="feedCarousel wrapCarousel">
                {searchResults.length > 0 ? (
                  searchResults.map((book) => <BookCard key={book.id} book={book} />)
                ) : (
                  <span className="noResults">No results found.</span>
                )}
              </div>
            </div>
          </>
        ) : (

          <>
            <div className="feedSection">
              <h2 className="feedTitle">
                {recommendations.length > 0 ? "Recommended For You (AI)" : "Trending Books"}
              </h2>
              <div className="feedCarousel">
                {recommendations.length > 0
                  ? recommendations.map((book) => <BookCard key={book.id} book={book} />)
                  : books.map((book) => <BookCard key={book.id} book={book} />)
                }
              </div>
            </div>

            <div className="feedSection">
              <h2 className="feedTitle">Your Library</h2>
              <div className="feedCarousel">
                {user && library.length > 0 ? (
                  library.map((book) => <BookCard key={book.id} book={book} />)
                ) : (
                  <span className="emptyLibrary">
                    {user ? "No books saved yet." : "Login to see your library."}
                  </span>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}