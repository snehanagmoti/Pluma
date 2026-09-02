import React from "react";
import "./BookCard.css";
import { useNavigate } from "react-router-dom";
import { FaStar, FaHeart, FaEye } from "react-icons/fa";
import API from "../../config/axios";

export default function BookCard({ book, onSave, saved = false }) {
  const navigate = useNavigate();
  const openBook = () => {
    const canonicalId = book.canonicalId || (book.isExternal ? book._id : `pluma:${book._id}`);
    API.post("/recommendations/feedback", { canonicalId, event: "open", context: "book-card" }).catch(() => undefined);
    if (book.isExternal || book.source === "openlibrary") {
      const nextWindow = window.open(book.readUrl || book.openLibraryUrl, "_blank", "noopener,noreferrer");
      if (nextWindow) nextWindow.opener = null;
      return;
    }
    navigate(`/book/${book._id}`);
  };

  return (
    <div className="bookCard" onClick={openBook} role="button" tabIndex={0} onKeyDown={event => { if (event.key === "Enter") openBook(); }}>
      <div className="bookCardImgWrapper">
        <img
          className="bookCardImg"
          src={book.cover || "https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400"}
          alt={book.title}
          loading="lazy"
        />
        <div className="bookCardOverlay">
          <p className="bookCardPreview">
            {book.desc?.substring(0, 120) || "A captivating story awaits..."}
            {book.desc?.length > 120 ? "..." : ""}
          </p>
          <button className="bookCardReadBtn">{book.isExternal ? "Open book" : "Read now"}</button>
        </div>
        {book.isExternal && <span className="bookCardSource">Open Library</span>}
      </div>

      <div className="bookCardBody">
        <h3 className="bookCardTitle">{book.title}</h3>
        <span className="bookCardAuthor">by {book.authorName}</span>
        {book.recommendation?.reasons?.[0] && <p className="bookCardReason">{book.recommendation.reasons[0]}</p>}

        <div className="bookCardGenres">
          {book.genres?.slice(0, 3).map((genre, i) => (
            <span key={i} className="bookCardGenre">{genre}</span>
          ))}
        </div>

        <div className="bookCardFooter">
          <div className="bookCardStat">
            <FaStar className="bookCardStatIconStar" />
            <span>{book.rating?.toFixed(1) || "0.0"}</span>
          </div>
          <div className="bookCardStat">
            <FaEye className="bookCardStatIconEye" />
            <span>{book.views || 0}</span>
          </div>
          <div className="bookCardStat">
            <FaHeart className="bookCardStatIconHeart" />
            <span>{book.likes?.length || 0}</span>
          </div>
          {onSave && <button className={`bookCardSave ${saved ? "saved" : ""}`} onClick={event => { event.stopPropagation(); onSave(book); }}>{saved ? "Saved" : "+ Library"}</button>}
        </div>
      </div>
    </div>
  );
}
