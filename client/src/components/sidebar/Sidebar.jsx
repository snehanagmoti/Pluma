import React from "react";
import "./Sidebar.css";
import {
  MdBookmark,
  MdSettings,
  MdPerson,
  MdRssFeed,
  MdGroup
} from "react-icons/md";
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation(); // To highlight the active page

  // Helper to check if link is active
  const isActive = (path) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="sidebarWrapper">
        <ul className="sidebarList">

          {/* 1. Feed / Home (Optional, but good to have) */}
          <Link to="/" className="link">
            <li className={`sidebarListItem ${isActive("/") ? "active" : ""}`}>
              <MdRssFeed className="sidebarIcon" />
              <span className="sidebarListItemText">Feed</span>
            </li>
          </Link>

          {/* 2. Profile Link */}
          <Link to={`/profile/${user?.username}`} className="link">
            <li className={`sidebarListItem ${isActive(`/profile/${user?.username}`) ? "active" : ""}`}>
              <MdPerson className="sidebarIcon" />
              <span className="sidebarListItemText">My Profile</span>
            </li>
          </Link>

          {/* 3. Bookmarks */}
          <Link to="/bookmarks" className="link">
            <li className={`sidebarListItem ${isActive("/bookmarks") ? "active" : ""}`}>
              <MdBookmark className="sidebarIcon" />
              <span className="sidebarListItemText">Bookmarks</span>
            </li>
          </Link>

          {/* 4. Groups (Uncomment if needed) */}
          {/* <Link to="/groups" className="link">
            <li className="sidebarListItem">
              <MdGroup className="sidebarIcon" />
              <span className="sidebarListItemText">Communities</span>
            </li>
          </Link> 
          */}

          <hr className="sidebarHr" />

          {/* 5. Settings */}
          <Link to="/settings" className="link">
            <li className={`sidebarListItem ${isActive("/settings") ? "active" : ""}`}>
              <MdSettings className="sidebarIcon" />
              <span className="sidebarListItemText">Settings</span>
            </li>
          </Link>

        </ul>
      </div>
    </div>
  );
}