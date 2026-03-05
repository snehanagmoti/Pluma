import React, { useEffect, useState } from "react";
import "./Single.css";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Topbar from "../../components/topbar/Topbar";

export default function Single() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [isAdded, setIsAdded] = useState(false); // <--- 1. New State for button
  const navigate = useNavigate();

  // Safe user parsing (handle case where user is null)
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  // 2. CHECK IF BOOK IS IN LIBRARY ON LOAD
  useEffect(() => {
    const checkLibraryStatus = async () => {
      if (user && token) {
        try {
          // We fetch the user's current library
          const res = await axios.get(
            `http://localhost:5000/api/users/${user._id}/library`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          // The backend returns an array of book objects. 
          // We check if THIS bookId exists in that array.
          const found = res.data.some((b) => b._id === bookId);
          setIsAdded(found);
        } catch (err) {
          console.log("Error checking library status:", err);
        }
      }
    };
    checkLibraryStatus();
  }, [bookId, token, user?._id]); // Run this when page loads


  // 3. FETCH BOOK DETAILS
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await axios.get(
          `http://localhost:5000/api/books/find/${bookId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setBook(res.data);
      } catch (err) {
        console.log("Error fetching book:", err);
      }
    };
    fetchBook();
  }, [bookId, token]);


  const handleLibrary = async () => {
    if (!user || !token) {
      alert("Please login to save books!");
      navigate("/login");
      return;
    }
    try {
      // 4. INSTANT UI TOGGLE (Optimistic UI)
      // We flip the button immediately so it feels fast
      setIsAdded(!isAdded);

      // Send request to backend
      const res = await axios.put(
        `http://localhost:5000/api/users/${user._id}/library`,
        { userId: user._id, bookId: book._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Optional: Show success message briefly
      // alert(res.data); 
    } catch (err) {
      // If error, flip it back
      setIsAdded(!isAdded);
      console.log(err);
    }
  };

  return (
    <>
      <Topbar setQuery={() => { }} />

      <div className="single">
        <div className="singleWrapper">

          {!book ? (
            <div style={{ marginTop: "20px" }}>Loading book...</div>
          ) : (
            <>
              <div className="singleBookInfo">
                <img src={book.cover} alt="" className="singleBookCover" />
                <div className="singleBookDesc">
                  <h1 className="singleTitle">{book.title}</h1>
                  <span className="singleAuthor">
                    Written by
                    <Link to={`/profile/${book.authorName}`} style={{ marginLeft: "5px", color: "teal", cursor: "pointer", textDecoration: "none" }}>
                      <b>{book.authorName}</b>
                    </Link>
                  </span>
                  <p className="singleDescText">{book.desc}</p>

                  <div className="singleActions">
                    <button className="singleBtn btnRead">Start Reading</button>

                    {/* 5. CONDITIONAL RENDERING OF BUTTON */}
                    <button
                      className={`singleBtn ${isAdded ? "btnRemove" : "btnLib"}`}
                      onClick={handleLibrary}
                      style={{ backgroundColor: isAdded ? "tomato" : "teal" }} // Optional visual cue
                    >
                      {isAdded ? "- Remove from Library" : "+ Add to Library"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="singleChapter">
                {book.chapters.map((chapter, index) => (
                  <div key={index} style={{ marginBottom: "50px" }}>
                    <h2 className="chapterTitle">{chapter.title}</h2>
                    <hr style={{ margin: "0 50px 30px 50px", opacity: "0.3" }} />
                    <p className="chapterContent">
                      {chapter.content}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}