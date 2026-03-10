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
  const activeUserSession = JSON.parse(localStorage.getItem("user"));
  const currentNavigationLocation = useLocation();

  const isCurrentPathActive = (targetPath) => currentNavigationLocation.pathname === targetPath;

  return (
    <div className="sidebar">
      <div className="sidebarWrapper">
        <ul className="sidebarList">

          <Link to="/" className="link">
            <li className={`sidebarListItem ${isCurrentPathActive("/") ? "active" : ""}`}>
              <MdRssFeed className="sidebarIcon" />
              <span className="sidebarListItemText">Feed</span>
            </li>
          </Link>

          <Link to={`/profile/${activeUserSession?.username}`} className="link">
            <li className={`sidebarListItem ${isCurrentPathActive(`/profile/${activeUserSession?.username}`) ? "active" : ""}`}>
              <MdPerson className="sidebarIcon" />
              <span className="sidebarListItemText">My Profile</span>
            </li>
          </Link>

          <Link to="/bookmarks" className="link">
            <li className={`sidebarListItem ${isCurrentPathActive("/bookmarks") ? "active" : ""}`}>
              <MdBookmark className="sidebarIcon" />
              <span className="sidebarListItemText">Bookmarks</span>
            </li>
          </Link>

          <hr className="sidebarHr" />

          <Link to="/settings" className="link">
            <li className={`sidebarListItem ${isCurrentPathActive("/settings") ? "active" : ""}`}>
              <MdSettings className="sidebarIcon" />
              <span className="sidebarListItemText">Settings</span>
            </li>
          </Link>

        </ul>
      </div>
    </div>
  );
}