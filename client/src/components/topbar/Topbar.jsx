import React from "react";
import "./Topbar.css";
import { FaSearch, FaPen, FaSignOutAlt } from "react-icons/fa";
import { HiHome } from "react-icons/hi"; // Modern Home Icon
import { useNavigate } from "react-router-dom";

export default function Topbar({ setQuery }) {
  const navigate = useNavigate();

  // Get user from local storage safely
  const user = JSON.parse(localStorage.getItem("user"));
  const username = user ? user.username : "User";

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="topbarContainer">
      {/* 1. LEFT: LOGO */}
      <div className="topbarLeft">
        <span className="logo" onClick={() => navigate("/")}>Pluma</span>
      </div>

      {/* 2. CENTER: SEARCH BAR */}
      <div className="topbarCenter">
        <div className="searchbar">
          <FaSearch className="searchIcon" />
          <input
            placeholder="Search for books or authors..."
            className="searchInput"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* 3. RIGHT: ICONS & PROFILE */}
      <div className="topbarRight">
        <div className="topbarLinks">

          {/* Write Button (Pill Shape) */}
          <div className="topbarIconItem" onClick={() => navigate("/write")} title="Write a Review">
            <FaPen />
          </div>

          {/* Home Button */}
          <div className="topbarIconItem" onClick={() => navigate("/")} title="Home">
            <HiHome />
          </div>

          {/* Logout Button */}
          <div className="topbarIconItem logoutIcon" onClick={handleLogout} title="Logout">
            <FaSignOutAlt />
          </div>

        </div>

        {/* User Avatar (Gradient Circle with First Letter) */}
        <div className="userAvatar" title={username}>
          {username.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
}