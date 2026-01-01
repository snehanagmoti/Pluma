import React from "react";
import "./BookCard.css";
import { Link } from "react-router-dom"; // Import Link

export default function BookCard({ book }) {
  return (
    // Wrap the whole card in a Link
    <Link to={`/book/${book._id}`} style={{ textDecoration: "none" }}>
      <div className="bookCard">
        <img src={book.cover} alt="" className="bookCover" />
        <div className="bookInfo">
          <h3 className="bookTitle">{book.title}</h3>
          <span className="bookAuthor">{book.authorName}</span>
        </div>
      </div>
    </Link>
  );
}