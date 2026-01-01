import React, { useState } from "react"; // Import useState
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import Feed from "../../components/feed/Feed";
import Rightbar from "../../components/rightbar/Rightbar";
import "./Home.css";

export default function Home() {
  // 1. This state holds what the user types in the Topbar
  const [query, setQuery] = useState("");

  return (
    <>
      {/* 2. We pass 'setQuery' to Topbar so it can CHANGE the text */}
      <Topbar setQuery={setQuery} />
      
      <div className="homeContainer">
        <Sidebar />
        
        {/* 3. We pass 'query' to Feed so it knows WHAT to search for */}
        <Feed query={query} />
        
        <Rightbar />
      </div>
    </>
  );
}