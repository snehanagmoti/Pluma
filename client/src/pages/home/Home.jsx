import React, { useState } from "react";
import "./Home.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import Feed from "../../components/feed/Feed";

export default function Home() {
  const [query, setQuery] = useState("");

  return (
    <>
      <Topbar setQuery={setQuery} />
      <div className="homeContainer">
        <Sidebar />
        <Feed query={query} />
      </div>
    </>
  );
}