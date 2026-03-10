import React, { useEffect, useState } from "react";
import "./Profile.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import BookCard from "../../components/bookCard/BookCard";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function Profile() {
  const [publishedBookCollection, setPublishedBookCollection] = useState([]);
  const { username } = useParams();

  useEffect(() => {
    const retrieveAuthorBookCollection = async () => {
      try {
        const authenticationToken = localStorage.getItem("token");

        const profileBooksResponse = await axios.get(`http://localhost:5000/api/books/profile/${username}`, {
          headers: {
            Authorization: `Bearer ${authenticationToken}`,
          },
        });

        setPublishedBookCollection(profileBooksResponse.data);
      } catch (networkRequestError) {
        console.log(networkRequestError);
      }
    };
    retrieveAuthorBookCollection();
  }, [username]);

  return (
    <>
      <Topbar setQuery={() => { }} />
      <div className="profile">
        <Sidebar />
        <div className="profileRight">

          <div className="profileCover">
            <img className="profileCoverImg" src="https://via.placeholder.com/1200x300" alt="" />
            <img className="profileUserImg" src="https://via.placeholder.com/150" alt="" />
          </div>
          <div className="profileInfo">
            <h4 className="profileInfoName">{username}</h4>
            <span className="profileInfoDesc">Aspiring writer on Pluma!</span>
          </div>

          <div className="profileBooks">
            <h2 className="profileSectionTitle">Published Books</h2>
            <div className="profileBookList">
              {publishedBookCollection.length > 0 ? (
                publishedBookCollection.map((book) => <BookCard key={book.id} book={book} />)
              ) : (
                <span style={{ color: "gray" }}>No public books yet.</span>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}