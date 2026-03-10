import React, { useEffect, useState } from "react";
import "./Bookmarks.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import BookCard from "../../components/bookCard/BookCard";
import axios from "axios";

export default function Bookmarks() {
  const [bookmarkedCollection, setBookmarkedCollection] = useState([]);

  const activeUserSession = JSON.parse(localStorage.getItem("user"));
  const authenticationToken = localStorage.getItem("token");

  useEffect(() => {
    const retrieveUserBookmarks = async () => {
      try {
        const libraryRetrievalResponse = await axios.get(`http://localhost:5000/api/users/${activeUserSession.id}/library`, {
          headers: { Authorization: `Bearer ${authenticationToken}` }
        });
        setBookmarkedCollection(libraryRetrievalResponse.data);
      } catch (networkRetrievalError) {
        console.log(networkRetrievalError);
      }
    };
    retrieveUserBookmarks();
  }, []);

  return (
    <>
      <Topbar setQuery={() => { }} />
      <div className="bookmarksContainer">
        <Sidebar />
        <div className="bookmarksRight">
          <h2 className="bookmarksTitle">My Bookmarks</h2>
          <div className="bookmarksWrapper">
            {bookmarkedCollection.length > 0 ? (
              bookmarkedCollection.map((book) => <BookCard key={book.id} book={book} />)
            ) : (
              <span className="noBookmarks">You haven't saved any books yet.</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}