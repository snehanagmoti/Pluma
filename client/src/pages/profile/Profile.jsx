import React, { useEffect, useState } from "react";
import "./Profile.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import BookCard from "../../components/bookCard/BookCard";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function Profile() {
  const [books, setBooks] = useState([]);
  const { username } = useParams(); 

  useEffect(() => {
    const fetchUserBooks = async () => {
      try {
        // 1. Get the token from storage
        const token = localStorage.getItem("token");

        // 2. Pass headers inside the axios configuration object
        const res = await axios.get(`http://localhost:5000/api/books/profile/${username}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        
        setBooks(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    fetchUserBooks();
  }, [username]);

  return (
    <>
      <Topbar setQuery={() => {}} />
      <div className="profile">
        <Sidebar />
        <div className="profileRight">
            
            {/* Profile Header */}
            <div className="profileCover">
                <img className="profileCoverImg" src="https://via.placeholder.com/1200x300" alt="" />
                <img className="profileUserImg" src="https://via.placeholder.com/150" alt="" />
            </div>
            <div className="profileInfo">
                <h4 className="profileInfoName">{username}</h4>
                <span className="profileInfoDesc">Aspiring writer on SocialApp!</span>
            </div>

            {/* Profile Content (Their Books) */}
            <div className="profileBooks">
                <h2 className="profileSectionTitle">Published Books</h2>
                <div className="profileBookList">
                    {books.length > 0 ? (
                        books.map((book) => <BookCard key={book._id} book={book} />)
                    ) : (
                        <span style={{color: "gray"}}>No public books yet.</span>
                    )}
                </div>
            </div>

        </div>
      </div>
    </>
  );
}