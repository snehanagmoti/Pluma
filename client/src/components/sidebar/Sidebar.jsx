import React from "react";
import "./Sidebar.css";
import { MdGroup, MdBookmark, MdForum, MdLibraryBooks } from "react-icons/md";
import { FaBookOpen, FaFeatherAlt, FaEnvelope, FaBell } from "react-icons/fa";
import { HiHome } from "react-icons/hi";
import { useNavigate, useLocation } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.username || "User";
  const avatar = user?.avatar || user?.profilePicture;

  const isActive = (path) => location.pathname === path;

  return (
    <div className="sidebar">
      <div className="sidebarWrapper">

        {/* User Mini Profile Card */}
        <div className="sidebarUserCard" onClick={() => navigate(`/profile/${username}`)}>
          <div className="sidebarUserAvatar">
            {avatar ? (
              <img src={avatar} alt="" className="sidebarUserImg" />
            ) : (
              <span>{username.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="sidebarUserInfo">
            <span className="sidebarUserName">{username}</span>
            <span className="sidebarUserLevel">Reader Level 3</span>
          </div>
        </div>

        <ul className="sidebarList">
          <li
            className={`sidebarListItem ${isActive('/') ? 'active' : ''}`}
            onClick={() => navigate("/")}
          >
            <HiHome className="sidebarIcon" />
            <span className="sidebarListItemText">Discover Books</span>
          </li>
          <li
            className={`sidebarListItem ${isActive('/catalog') ? 'active' : ''}`}
            onClick={() => navigate("/catalog")}
          >
            <MdLibraryBooks className="sidebarIcon" />
            <span className="sidebarListItemText">Real Book Catalog</span>
          </li>
          <li
            className={`sidebarListItem ${isActive('/community') ? 'active' : ''}`}
            onClick={() => navigate("/community")}
          >
            <MdForum className="sidebarIcon" />
            <span className="sidebarListItemText">Community Feed</span>
          </li>
          <li
            className={`sidebarListItem ${location.pathname.startsWith('/messages') ? 'active' : ''}`}
            onClick={() => navigate("/messages")}
          >
            <FaEnvelope className="sidebarIcon" />
            <span className="sidebarListItemText">Messages</span>
          </li>
          <li
            className={`sidebarListItem ${isActive('/notifications') ? 'active' : ''}`}
            onClick={() => navigate("/notifications")}
          >
            <FaBell className="sidebarIcon" />
            <span className="sidebarListItemText">Notifications</span>
          </li>
          <li
            className={`sidebarListItem ${isActive('/bookmarks') ? 'active' : ''}`}
            onClick={() => navigate("/bookmarks")}
          >
            <MdBookmark className="sidebarIcon" />
            <span className="sidebarListItemText">Bookmarks</span>
          </li>
          <li
            className={`sidebarListItem ${location.pathname.startsWith('/groups') ? 'active' : ''}`}
            onClick={() => navigate("/groups")}
          >
            <MdGroup className="sidebarIcon" />
            <span className="sidebarListItemText">Channels & Clubs</span>
          </li>
        </ul>

        {/* Reading Stats Widget */}
        <div className="sidebarWidget">
          <h4 className="sidebarWidgetTitle">Your Reading Journey</h4>
          <div className="sidebarStatItem">
            <div className="sidebarStatIconWrapper">
              <FaBookOpen className="sidebarStatIcon" />
            </div>
            <div className="sidebarStatInfo">
              <span className="sidebarStatValue">{user?.readingStats?.booksRead || 0}</span>
              <span className="sidebarStatLabel">Books Read</span>
            </div>
          </div>
          <div className="sidebarStatItem">
            <div className="sidebarStatIconWrapper gold">
              <FaFeatherAlt className="sidebarStatIcon" />
            </div>
            <div className="sidebarStatInfo">
              <span className="sidebarStatValue">{user?.readingStats?.readingStreak || 0} Days</span>
              <span className="sidebarStatLabel">Current Streak</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
