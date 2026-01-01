import React, { useEffect, useState } from "react";
import "./Bookmarks.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import BookCard from "../../components/bookCard/BookCard";
import axios from "axios";

export default function Bookmarks() {
  const [books, setBooks] = useState([]);
  
  // Get User and Token
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        // Fetch the user's library using the existing backend route
        const res = await axios.get(`http://localhost:5000/api/users/${user._id}/library`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBooks(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Topbar setQuery={() => {}} />
      <div className="bookmarksContainer">
        <Sidebar />
        <div className="bookmarksRight">
            <h2 className="bookmarksTitle">My Bookmarks</h2>
            <div className="bookmarksWrapper">
                {books.length > 0 ? (
                    books.map((book) => <BookCard key={book._id} book={book} />)
                ) : (
                    <span className="noBookmarks">You haven't saved any books yet.</span>
                )}
            </div>
        </div>
      </div>
    </>
  );
}