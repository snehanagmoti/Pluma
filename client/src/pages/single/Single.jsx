import React, { useEffect, useState } from "react";
import "./Single.css";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Topbar from "../../components/topbar/Topbar";

export default function Single() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [isAddedToLibrary, setIsAddedToLibrary] = useState(false);
  const navigate = useNavigate();

  const activeUserSession = JSON.parse(localStorage.getItem("user"));
  const authenticationToken = localStorage.getItem("token");

  useEffect(() => {
    const checkLibraryStatus = async () => {
      if (activeUserSession && authenticationToken) {
        try {
          const libraryStatusResponse = await axios.get(
            `http://localhost:5000/api/users/${activeUserSession.id}/library`,
            { headers: { Authorization: `Bearer ${authenticationToken}` } }
          );

          const isBookPresent = libraryStatusResponse.data.some((targetBook) => targetBook.id === bookId);
          setIsAddedToLibrary(isBookPresent);
        } catch (networkError) {
          console.log(networkError);
        }
      }
    };
    checkLibraryStatus();
  }, [bookId, authenticationToken, activeUserSession?.id]);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        const bookDetailsResponse = await axios.get(
          `http://localhost:5000/api/books/find/${bookId}`,
          { headers: { Authorization: `Bearer ${authenticationToken}` } }
        );
        setBook(bookDetailsResponse.data);
      } catch (networkError) {
        console.log(networkError);
      }
    };
    fetchBookDetails();
  }, [bookId, authenticationToken]);

  const handleLibraryToggle = async () => {
    if (!activeUserSession || !authenticationToken) {
      alert("Please login to save books!");
      navigate("/login");
      return;
    }

    try {
      setIsAddedToLibrary(!isAddedToLibrary);

      await axios.put(
        `http://localhost:5000/api/users/${activeUserSession.id}/library`,
        { userId: activeUserSession.id, bookId: book.id },
        { headers: { Authorization: `Bearer ${authenticationToken}` } }
      );
    } catch (networkError) {
      setIsAddedToLibrary(!isAddedToLibrary);
      console.log(networkError);
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

                    <button
                      className={`singleBtn ${isAddedToLibrary ? "btnRemove" : "btnLib"}`}
                      onClick={handleLibraryToggle}
                      style={{ backgroundColor: isAddedToLibrary ? "tomato" : "teal" }}
                    >
                      {isAddedToLibrary ? "- Remove from Library" : "+ Add to Library"}
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