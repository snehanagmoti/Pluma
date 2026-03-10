import React from "react";
import "./Topbar.css";
import { FaSearch, FaPen, FaSignOutAlt } from "react-icons/fa";
import { HiHome } from "react-icons/hi";
import { useNavigate } from "react-router-dom";

export default function Topbar({ setQuery }) {
  const navigationController = useNavigate();

  const activeUserSession = JSON.parse(localStorage.getItem("user"));
  const currentSessionUsername = activeUserSession ? activeUserSession.username : "User";

  const executeSessionLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigationController("/login");
  };

  return (
    <div className="topbarContainer">
      <div className="topbarLeft">
        <span className="logo" onClick={() => navigationController("/")}>Pluma</span>
      </div>

      <div className="topbarCenter">
        <div className="searchbar">
          <FaSearch className="searchIcon" />
          <input
            placeholder="Search for books or authors..."
            className="searchInput"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <div className="topbarRight">
        <div className="topbarLinks">

          <div className="topbarIconItem" onClick={() => navigationController("/write")} title="Write a Review">
            <FaPen />
          </div>

          <div className="topbarIconItem" onClick={() => navigationController("/")} title="Home">
            <HiHome />
          </div>

          <div className="topbarIconItem logoutIcon" onClick={executeSessionLogout} title="Logout">
            <FaSignOutAlt />
          </div>

        </div>

        <div className="userAvatar" title={currentSessionUsername}>
          {currentSessionUsername.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
}