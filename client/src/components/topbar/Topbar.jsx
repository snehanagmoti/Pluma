import React, { useState, useRef, useEffect } from "react";
import "./Topbar.css";
import { FaSearch, FaPen, FaSignOutAlt, FaBell, FaEnvelope, FaMoon, FaSun } from "react-icons/fa";
import { HiHome } from "react-icons/hi";
import { MdSettings, MdPerson, MdBookmark } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import API from "../../config/axios";
import { useTheme } from "../../context/ThemeContext";

export default function Topbar({ setQuery }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user"));
  const username = user ? user.username : "User";
  const avatar = user?.avatar || user?.profilePicture;

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      // Notifications should not interrupt the rest of navigation.
    }
  };

  useEffect(() => {
    fetchNotifications();
    const poll = setInterval(fetchNotifications, 30000);
    return () => clearInterval(poll);
  }, []);

  const openNotification = async notification => {
    try {
      if (!notification.read) await API.put(`/notifications/${notification._id}/read`);
    } catch (error) {}
    setShowNotifications(false);
    if (notification.link) navigate(notification.link);
    fetchNotifications();
  };

  const markAllRead = async () => {
    await API.put("/notifications/read-all");
    setNotifications(current => current.map(notification => ({ ...notification, read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="topbarContainer">
      <div className="topbarLeft">
        <span className="logo" onClick={() => navigate("/")}>Pluma</span>
      </div>

      <div className="topbarCenter">
        <div className={`searchbar ${searchFocused ? "searchbarFocused" : ""}`}>
          <FaSearch className="searchIcon" />
          <input
            placeholder="Search books, authors, genres..."
            className="searchInput"
            onChange={(e) => setQuery?.(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </div>
      </div>

      <div className="topbarRight">
        <div className="topbarLinks">
          <div className="topbarIconItem writeBtn" onClick={() => navigate("/projects")} title="Write">
            <FaPen style={{ fontSize: "14px" }} />
            <span className="writeBtnText">Write</span>
          </div>

          <div className="topbarIconItem" onClick={() => navigate("/")} title="Home">
            <HiHome />
          </div>

          <div className="topbarIconItem" onClick={() => navigate("/messages")} title="Messages">
            <FaEnvelope />
          </div>

          <button className="topbarIconItem topbarIconButton" onClick={toggleTheme} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <FaSun /> : <FaMoon />}
          </button>

          <div className="topbarNotificationWrapper" ref={notificationRef}>
            <button className="topbarIconItem topbarIconButton" title="Notifications" onClick={() => { setShowNotifications(!showNotifications); setShowDropdown(false); }}>
              <FaBell />
              {unreadCount > 0 && <span className="notifBadge">{unreadCount > 9 ? "9+" : unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="notificationDropdown">
                <header>
                  <div><span>Activity</span><h3>Notifications</h3></div>
                  {unreadCount > 0 && <button onClick={markAllRead}>Mark all read</button>}
                </header>
                <div className="notificationDropdownList">
                  {notifications.length > 0 ? notifications.slice(0, 8).map(notification => {
                    const actorAvatar = notification.actor?.avatar || notification.actor?.profilePicture;
                    return (
                      <button key={notification._id} className={notification.read ? "" : "unread"} onClick={() => openNotification(notification)}>
                        <div className="notificationAvatar">{actorAvatar ? <img src={actorAvatar} alt="" /> : (notification.actor?.username || "P").charAt(0).toUpperCase()}</div>
                        <span><strong>{notification.text}</strong><small>{new Date(notification.createdAt).toLocaleString()}</small></span>
                        {!notification.read && <i />}
                      </button>
                    );
                  }) : <div className="notificationEmpty"><FaBell /><p>You’re all caught up.</p></div>}
                </div>
                <button className="notificationViewAll" onClick={() => { setShowNotifications(false); navigate("/notifications"); }}>View all notifications</button>
              </div>
            )}
          </div>
        </div>

        {/* User Avatar + Dropdown */}
        <div className="userAvatarWrapper" ref={dropdownRef}>
          <div
            className="userAvatar"
            title={username}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {avatar ? (
              <img src={avatar} alt="" className="userAvatarImg" />
            ) : (
              username.charAt(0).toUpperCase()
            )}
          </div>

          {showDropdown && (
            <div className="userDropdown">
              <div className="dropdownHeader">
                <div className="dropdownAvatar">
                  {avatar ? (
                    <img src={avatar} alt="" className="dropdownAvatarImg" />
                  ) : (
                    username.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <span className="dropdownName">{username}</span>
                  <span className="dropdownEmail">{user?.email}</span>
                </div>
              </div>
              <hr className="dropdownHr" />
              <div className="dropdownItem" onClick={() => { navigate(`/profile/${username}`); setShowDropdown(false); }}>
                <MdPerson /> My Profile
              </div>
              <div className="dropdownItem" onClick={() => { navigate("/bookmarks"); setShowDropdown(false); }}>
                <MdBookmark /> Bookmarks
              </div>
              <div className="dropdownItem" onClick={() => { navigate("/settings"); setShowDropdown(false); }}>
                <MdSettings /> Settings
              </div>
              <hr className="dropdownHr" />
              <div className="dropdownItem dropdownLogout" onClick={handleLogout}>
                <FaSignOutAlt /> Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
