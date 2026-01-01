import React, { useState } from "react";
import "./Write.css";
import axios from "axios";
import Topbar from "../../components/topbar/Topbar";
import { useNavigate } from "react-router-dom";

export default function Write() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [privacy, setPrivacy] = useState("private");
  const navigate = useNavigate();

  // Get the logged-in user info from local storage
  const user = JSON.parse(localStorage.getItem("user"));
  
  // 1. Get the token
  const token = localStorage.getItem("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check for both user object and token
    if (!user || !token) {
      alert("You must be logged in to publish a book!");
      navigate("/login");
      return;
    }

    // Construct the Book Object matching your Backend Model
    const newBook = {
      userId: user._id,
      authorName: user.username,
      title: title,
      desc: desc,
      privacy: privacy,
      cover: "https://via.placeholder.com/800x400", // Placeholder for now
      chapters: [
        {
          title: "Chapter 1",
          content: chapterContent,
        },
      ],
    };

    try {
      // 2. Add headers as the THIRD argument to axios.post
      await axios.post("http://localhost:5000/api/books", newBook, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
      });
      
      alert("Book Published Successfully!");
      navigate("/"); // Go back home
    } catch (err) {
      console.log(err);
      alert("Error publishing book");
    }
  };

  return (
    <>
      {/* We pass empty setQuery because Topbar expects it, but we won't search here */}
      <Topbar setQuery={() => {}} />
      
      <div className="write">
        <div className="writeWrapper">
            <img
                className="writeImg"
                src="https://via.placeholder.com/800x400"
                alt=""
            />
            <form className="writeForm" onSubmit={handleSubmit}>
                <div className="writeFormGroup">
                    <input
                        type="text"
                        placeholder="Title of your Story"
                        className="writeInput"
                        autoFocus={true}
                        onChange={e=>setTitle(e.target.value)}
                        required
                    />
                </div>
                
                <div className="writeFormGroup">
                    <input
                        type="text"
                        placeholder="Short Description..."
                        className="writeInput"
                        style={{fontSize: "18px"}}
                        onChange={e=>setDesc(e.target.value)}
                    />
                </div>

                <div className="writePrivacy">
                    <label>Privacy: </label>
                    <select 
                        value={privacy} 
                        onChange={(e) => setPrivacy(e.target.value)}
                        style={{marginLeft: "10px", padding: "5px"}}
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
                        onChange={e=>setChapterContent(e.target.value)}
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