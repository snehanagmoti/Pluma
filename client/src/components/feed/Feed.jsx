import React, { useEffect, useState } from "react";
import "./Feed.css";
import BookCard from "../bookCard/BookCard";
import axios from "axios";

export default function Feed({ query }) {
  const [books, setBooks] = useState([]);
  const [library, setLibrary] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchType, setSearchType] = useState("book"); 
  
  // Get User safely
  const user = JSON.parse(localStorage.getItem("user"));

  // 1. Initial Load (Normal Feed + Library)
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        // Define authHeader INSIDE the effect to avoid dependency warnings
        const token = localStorage.getItem("token");
        const authHeader = { headers: { Authorization: `Bearer ${token}` } };

        // Fetch Public Books (Protected by backend now)
        const res = await axios.get("http://localhost:5000/api/books/public", authHeader);
        setBooks(res.data);

        // Fetch User's Library (Only if logged in)
        if (user) {
          const libRes = await axios.get(
            `http://localhost:5000/api/users/${user._id}/library`, 
            authHeader
          );
          setLibrary(libRes.data);
        }
      } catch (err) {
        console.log("Error fetching feed:", err);
      }
    };
    fetchBooks();
  }, [user]); // Only run if 'user' changes (e.g. login/logout)

  // 2. Search Logic
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
    
    // Debounce to prevent too many API calls
    const timer = setTimeout(() => {
      fetchSearch();
    }, 500);

    return () => clearTimeout(timer);
  }, [query, searchType]);

  return (
    <div className="feed">
      <div className="feedWrapper">
        
        {/* --- SEARCH MODE --- */}
        {query ? (
          <>
            <div className="searchFilters" style={{marginBottom: "20px", padding: "10px", background: "#fff", borderRadius: "10px"}}>
               <span style={{fontWeight: "bold", marginRight: "10px"}}>Filter by:</span>
               
               <label style={{marginRight: "15px", cursor: "pointer"}}>
                 <input 
                   type="radio" 
                   name="filter" 
                   checked={searchType === "book"} 
                   onChange={() => setSearchType("book")} 
                 /> Title
               </label>
               
               <label style={{cursor: "pointer"}}>
                 <input 
                   type="radio" 
                   name="filter" 
                   checked={searchType === "author"} 
                   onChange={() => setSearchType("author")} 
                 /> Author
               </label>
            </div>

            <div className="feedSection">
              <h2 className="feedTitle">Search Results for "{query}"</h2>
              <div className="feedCarousel" style={{flexWrap: "wrap", overflowX: "hidden"}}>
                {searchResults.length > 0 ? (
                   searchResults.map((book) => <BookCard key={book._id} book={book} />)
                ) : (
                   <span>No results found.</span>
                )}
              </div>
            </div>
          </>
        ) : (
          
          /* --- NORMAL FEED MODE --- */
          <>
            <div className="feedSection">
              <h2 className="feedTitle">Recommended for You</h2>
              <div className="feedCarousel">
                {books.map((book) => (
                  <BookCard key={book._id} book={book} />
                ))}
              </div>
            </div>

            <div className="feedSection">
              <h2 className="feedTitle">Your Library</h2>
              <div className="feedCarousel">
                {user && library.length > 0 ? (
                    library.map((book) => (
                      <BookCard key={book._id} book={book} />
                    ))
                ) : (
                    <span style={{color: "gray", marginLeft: "10px"}}>
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