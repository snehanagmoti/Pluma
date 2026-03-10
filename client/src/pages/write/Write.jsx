import React, { useState } from "react";
import "./Write.css";
import axios from "axios";
import Topbar from "../../components/topbar/Topbar";
import { useNavigate } from "react-router-dom";

export default function Write() {
  const [bookTitle, setBookTitle] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [bookGenres, setBookGenres] = useState("");
  const [initialChapterContent, setInitialChapterContent] = useState("");
  const [publicationPrivacy, setPublicationPrivacy] = useState("private");
  const navigationController = useNavigate();

  const activeUserSession = JSON.parse(localStorage.getItem("user"));
  const authenticationToken = localStorage.getItem("token");

  const handleBookSubmission = async (event) => {
    event.preventDefault();

    if (!activeUserSession || !authenticationToken) {
      alert("You must be logged in to publish a book!");
      navigationController("/login");
      return;
    }

    const formattedGenreArray = bookGenres
      .split(",")
      .map((genre) => genre.trim().toLowerCase())
      .filter((genre) => genre !== "");

    if (formattedGenreArray.length === 0) {
      alert("Please add at least one genre (e.g. Fantasy)");
      return;
    }

    const newBookPayload = {
      userId: activeUserSession.id,
      authorName: activeUserSession.username,
      title: bookTitle,
      desc: bookDescription,
      genres: formattedGenreArray,
      privacy: publicationPrivacy,
      cover: "https://via.placeholder.com/800x400",
      chapters: [
        {
          title: "Chapter 1",
          content: initialChapterContent,
        },
      ],
    };

    try {
      await axios.post("http://localhost:5000/api/books", newBookPayload, {
        headers: {
          Authorization: `Bearer ${authenticationToken}`,
        },
      });

      alert("Book Published Successfully!");
      navigationController("/");
    } catch (networkSubmissionError) {
      console.log(networkSubmissionError);
      alert("Error publishing book");
    }
  };

  return (
    <>
      <Topbar setQuery={() => { }} />

      <div className="write">
        <div className="writeWrapper">
          <img
            className="writeImg"
            src="https://via.placeholder.com/800x400"
            alt=""
          />
          <form className="writeForm" onSubmit={handleBookSubmission}>
            <div className="writeFormGroup">
              <input
                type="text"
                placeholder="Title of your Story"
                className="writeInput"
                autoFocus={true}
                onChange={event => setBookTitle(event.target.value)}
                required
              />
            </div>
            <div className="writeFormGroup">
              <input
                type="text"
                placeholder="Genres (e.g. Horror, Mystery, Sci-Fi)"
                className="writeInput"
                style={{ fontSize: "16px", fontStyle: "italic" }}
                onChange={event => setBookGenres(event.target.value)}
                required
              />
            </div>
            <div className="writeFormGroup">
              <input
                type="text"
                placeholder="Short Description..."
                className="writeInput"
                style={{ fontSize: "18px" }}
                onChange={event => setBookDescription(event.target.value)}
              />
            </div>

            <div className="writePrivacy">
              <label>Privacy: </label>
              <select
                value={publicationPrivacy}
                onChange={(event) => setPublicationPrivacy(event.target.value)}
                style={{ marginLeft: "10px", padding: "5px" }}
              >
                <option value="private">Private (Draft)</option>
                <option value="public">Public</option>
              </select>
            </div>

            <div className="writeFormGroup">
              <textarea
                placeholder="Start writing your first chapter..."
                type="text"
                className="writeInput writeText"
                onChange={event => setInitialChapterContent(event.target.value)}
                required
              ></textarea>
            </div>

            <button className="writeSubmit" type="submit">
              Publish
            </button>
          </form>
        </div>
      </div>
    </>
  );
}