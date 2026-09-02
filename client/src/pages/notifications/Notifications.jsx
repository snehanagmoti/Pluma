import React, { useEffect, useState } from "react";
import { FaBell, FaCheckDouble } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import API from "../../config/axios";
import "./Notifications.css";

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data.notifications || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const openItem = async item => {
    if (!item.read) await API.put(`/notifications/${item._id}/read`);
    if (item.link) navigate(item.link);
  };

  const readAll = async () => {
    await API.put("/notifications/read-all");
    setNotifications(current => current.map(item => ({ ...item, read: true })));
  };

  return (
    <>
      <Topbar />
      <div className="notificationsPage">
        <Sidebar />
        <main className="notificationsMain">
          <header className="notificationsHeader">
            <div><span>Your Pluma activity</span><h1><FaBell /> Notifications</h1></div>
            <button onClick={readAll}><FaCheckDouble /> Mark all read</button>
          </header>
          <div className="notificationsList">
            {loading ? <div className="notificationsState">Loading activity…</div> : notifications.length > 0 ? notifications.map(item => {
              const avatar = item.actor?.avatar || item.actor?.profilePicture;
              return (
                <button key={item._id} className={item.read ? "" : "unread"} onClick={() => openItem(item)}>
                  <div className="notificationsAvatar">{avatar ? <img src={avatar} alt="" /> : (item.actor?.username || "P").charAt(0).toUpperCase()}</div>
                  <div><strong>{item.text}</strong><span>{new Date(item.createdAt).toLocaleString()}</span></div>
                  {!item.read && <i />}
                </button>
              );
            }) : <div className="notificationsState"><FaBell /><h2>No new activity</h2><p>Your follows, replies, likes, channels, and messages will appear here.</p></div>}
          </div>
        </main>
      </div>
    </>
  );
}
