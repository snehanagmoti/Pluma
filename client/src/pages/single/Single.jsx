import React, { useEffect, useState } from "react";
import "./Single.css";
import { useParams, Link, useNavigate } from "react-router-dom"; 
import axios from "axios";
import Topbar from "../../components/topbar/Topbar";

export default function Single() {
  const { bookId } = useParams(); 
  const [book, setBook] = useState(null);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  // 1. Helper to get the token easily
  const token = localStorage.getItem("token");

  const handleLibrary = async () => {
    if (!user || !token) {
        alert("Please login to save books!");
        navigate("/login");
        return;
    }
    try {
      // 2. Added headers to the PUT request (3rd argument in axios.put)
      const res = await axios.put(
        `http://localhost:5000/api/users/${user._id}/library`, 
        { userId: user._id, bookId: book._id }, // Data body
        { headers: { Authorization: `Bearer ${token}` } } // Config/Headers
      );
      alert(res.data); 
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    const fetchBook = async () => {
      try {
        // 3. Added headers to the GET request
        const res = await axios.get(
            `http://localhost:5000/api/books/find/${bookId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        setBook(res.data);
      } catch (err) {
        console.log("Error fetching book:", err);
        // Optional: If error is 403/401, redirect to login?
      }
    };
    fetchBook();
  }, [bookId, token]); // Added token to dependency array

  return (
    <>
      <Topbar setQuery={() => {}} />
      
      <div className="single">
        <div className="singleWrapper">
            
          {!book ? (
            <div style={{marginTop: "20px"}}>Loading book...</div>
          ) : (
            <>
              <div className="singleBookInfo">
                <img src={book.cover} alt="" className="singleBookCover" />
                <div className="singleBookDesc">
                  <h1 className="singleTitle">{book.title}</h1>
                  <span className="singleAuthor">
                    Written by 
                    <Link to={`/profile/${book.authorName}`} style={{marginLeft: "5px", color: "teal", cursor: "pointer", textDecoration: "none"}}>
                        <b>{book.authorName}</b>
                    </Link>
                  </span>
                  <p className="singleDescText">{book.desc}</p>
                  
                  <div className="singleActions">
                      <button className="singleBtn btnRead">Start Reading</button>
                      <button className="singleBtn btnLib" onClick={handleLibrary}>+ Add to Library</button>
                  </div>
                </div>
              </div>

              <div className="singleChapter">
                {book.chapters.map((chapter, index) => (
                    <div key={index} style={{marginBottom: "50px"}}>
                        <h2 className="chapterTitle">{chapter.title}</h2>
                        <hr style={{margin: "0 50px 30px 50px", opacity: "0.3"}}/>
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