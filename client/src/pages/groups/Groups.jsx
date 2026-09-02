import React, { useState, useEffect } from "react";
import "./Groups.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import API from "../../config/axios";
import { MdGroup, MdClose } from "react-icons/md";
import { FaUsers, FaBookOpen, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

export default function Groups() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", description: "", kind: "topic", topics: "", emoji: "💬", book: "" });
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchGroups = async () => {
    try {
      const res = await API.get("/groups");
      setGroups(res.data);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGroups();
    API.get("/books/all").then(res => setCatalog(res.data || [])).catch(() => setCatalog([]));
  }, []);

  const handleJoin = async (groupId) => {
    try {
      await API.put(`/groups/${groupId}/join`);
      fetchGroups(); // Refresh data
    } catch (err) {
      console.error("Failed to join group");
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    try {
      await API.post("/groups", {
        ...newGroup,
        topics: newGroup.topics.split(",").map(topic => topic.trim()).filter(Boolean),
      });
      setShowCreateModal(false);
      setNewGroup({ name: "", description: "", kind: "topic", topics: "", emoji: "💬", book: "" });
      fetchGroups();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create group");
    }
  };

  return (
    <>
      <Topbar />
      <div className="groupsPage">
        <Sidebar />
        <div className="groupsMain">
          <div className="groupsHeader">
            <div>
              <h1 className="groupsTitle">
                <MdGroup className="groupsTitleIcon" /> Channels & Fan Clubs
              </h1>
              <p className="groupsSubtitle">Talk about books, swap theories, host read-alongs, and build fandoms together.</p>
            </div>
            <button className="createGroupBtn" onClick={() => setShowCreateModal(true)}>
              <FaPlus /> Create Group
            </button>
          </div>

          <div className="groupsGrid">
            {loading ? (
              <p>Loading groups...</p>
            ) : groups.length > 0 ? (
              groups.map((group, i) => {
                const isMember = group.members?.includes(user?._id);
                return (
                  <div key={group._id} className="groupCard" style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="groupCardBanner" style={{ background: group.color || "linear-gradient(135deg, #667eea, #764ba2)" }} onClick={() => navigate(`/groups/${group._id}`)}>
                      <span className="groupCardEmoji">{group.emoji || "💬"}</span>
                      <div><small>{group.kind?.replace("-", " ")}</small><h3 className="groupCardName">{group.name}</h3></div>
                    </div>
                    <div className="groupCardBody">
                      <p className="groupCardDesc">{group.description}</p>
                      {group.topics?.length > 0 && <div className="groupTopicTags">{group.topics.slice(0, 4).map(topic => <span key={topic}>#{topic}</span>)}</div>}
                      <div className="groupCardStats">
                        <div className="groupCardStat">
                          <FaUsers />
                          <span>{group.members?.length || 0} members</span>
                        </div>
                        <div className="groupCardStat">
                          <FaBookOpen />
                          <span>{(group.books?.length || 0) + (group.book ? 1 : 0)} books</span>
                        </div>
                      </div>
                      <div className="groupCardActions">
                        <button className="openGroupBtn" onClick={() => navigate(`/groups/${group._id}`)}>Open discussion</button>
                        <button className={`joinGroupBtn ${isMember ? 'joined' : ''}`} onClick={() => handleJoin(group._id)}>{isMember ? "Leave" : "Join"}</button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p>No groups found. Be the first to create one!</p>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="modalOverlay" onClick={() => setShowCreateModal(false)}>
          <div className="modalContent" onClick={e => e.stopPropagation()}>
            <button className="modalCloseBtn" onClick={() => setShowCreateModal(false)}>
              <MdClose />
            </button>
            <h2 className="modalTitle">Create New Group</h2>
            <form className="modalForm" onSubmit={handleCreateGroup}>
              <input
                type="text"
                placeholder="Group Name"
                required
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                className="modalInput"
              />
              <textarea
                placeholder="Description"
                rows={4}
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                className="modalInput"
              />
              <div className="groupModalRow">
                <select value={newGroup.kind} onChange={(e) => setNewGroup({ ...newGroup, kind: e.target.value })} className="modalInput">
                  <option value="topic">Topic Channel</option>
                  <option value="book-club">Book Club</option>
                  <option value="fan-club">Fan Club</option>
                  <option value="writing-circle">Writing Circle</option>
                </select>
                <input value={newGroup.emoji} onChange={(e) => setNewGroup({ ...newGroup, emoji: e.target.value.slice(0, 4) })} className="modalInput groupEmojiInput" aria-label="Channel emoji" />
              </div>
              <input
                type="text"
                placeholder="Topics (comma-separated)"
                value={newGroup.topics}
                onChange={(e) => setNewGroup({ ...newGroup, topics: e.target.value })}
                className="modalInput"
              />
              <select value={newGroup.book} onChange={(e) => setNewGroup({ ...newGroup, book: e.target.value })} className="modalInput">
                <option value="">No featured book</option>
                {catalog.map(book => <option key={book._id} value={book._id}>{book.title} — {book.authorName}</option>)}
              </select>
              <button type="submit" className="modalSubmitBtn">Create</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
