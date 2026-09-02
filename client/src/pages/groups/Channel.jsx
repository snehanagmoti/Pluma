import React, { useCallback, useEffect, useState } from "react";
import { FaBookOpen, FaHashtag, FaUsers } from "react-icons/fa";
import { MdArrowBack, MdForum, MdInfoOutline } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import SocialComposer from "../../components/social/SocialComposer";
import SocialPostCard from "../../components/social/SocialPostCard";
import API from "../../config/axios";
import "./Channel.css";

export default function Channel() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [tab, setTab] = useState("discussion");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchChannel = useCallback(async () => {
    try {
      const [groupRes, postsRes] = await Promise.all([
        API.get(`/groups/${groupId}`),
        API.get("/social/posts", { params: { channelId: groupId } }),
      ]);
      setGroup(groupRes.data);
      setPosts(postsRes.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "This channel could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchChannel(); }, [fetchChannel]);

  const isMember = group?.members?.some(member => (member._id || member).toString() === currentUser?._id);

  const toggleMembership = async () => {
    await API.put(`/groups/${groupId}/join`);
    fetchChannel();
  };

  if (loading) return <><Topbar /><div className="channelState">Loading channel…</div></>;
  if (error || !group) return <><Topbar /><div className="channelState"><h2>Channel unavailable</h2><p>{error}</p><button onClick={() => navigate("/groups")}>Back to channels</button></div></>;

  return (
    <>
      <Topbar />
      <div className="channelPage">
        <Sidebar />
        <main className="channelMain">
          <button className="channelBack" onClick={() => navigate("/groups")}><MdArrowBack /> All channels</button>
          <header className="channelHero" style={{ background: group.color }}>
            <div className="channelEmoji">{group.emoji || "💬"}</div>
            <div className="channelHeroCopy">
              <span>{group.kind?.replace("-", " ")}</span>
              <h1>{group.name}</h1>
              <p>{group.description}</p>
              <div><FaUsers /> {group.members?.length || 0} members {group.topics?.map(topic => <i key={topic}>#{topic}</i>)}</div>
            </div>
            <button className={isMember ? "channelJoin joined" : "channelJoin"} onClick={toggleMembership}>{isMember ? "Joined" : "Join channel"}</button>
          </header>

          <nav className="channelTabs">
            <button className={tab === "discussion" ? "active" : ""} onClick={() => setTab("discussion")}><MdForum /> Discussion</button>
            <button className={tab === "members" ? "active" : ""} onClick={() => setTab("members")}><FaUsers /> Members</button>
            <button className={tab === "about" ? "active" : ""} onClick={() => setTab("about")}><MdInfoOutline /> About</button>
          </nav>

          {tab === "discussion" && (
            <div className="channelDiscussion">
              {isMember ? (
                <SocialComposer channelId={groupId} placeholder={`Post to ${group.name}…`} onCreated={post => setPosts(current => [post, ...current])} />
              ) : (
                <div className="channelJoinPrompt"><FaHashtag /><p>Join the channel to participate in this discussion.</p><button onClick={toggleMembership}>Join now</button></div>
              )}
              <div className="channelPostList">
                {posts.length > 0 ? posts.map(post => (
                  <SocialPostCard key={post._id} initialPost={post} onDeleted={id => setPosts(current => current.filter(item => item._id !== id))} />
                )) : <div className="channelEmpty"><MdForum /><h2>No discussion yet</h2><p>Break the ice with a question, theory, or favorite line.</p></div>}
              </div>
            </div>
          )}

          {tab === "members" && (
            <div className="channelMembers">
              {group.members?.map(member => {
                const avatar = member.avatar || member.profilePicture;
                return <button key={member._id} onClick={() => navigate(`/profile/${member.username}`)}><div>{avatar ? <img src={avatar} alt="" /> : member.username.charAt(0).toUpperCase()}</div><span><strong>{member.username}</strong><small>{member.bio || "Reader & writer"}</small></span></button>;
              })}
            </div>
          )}

          {tab === "about" && (
            <div className="channelAbout">
              <h2>About this channel</h2><p>{group.description}</p>
              <div className="channelAboutGrid"><span><strong>Created by</strong>{group.admin?.username || "Pluma reader"}</span><span><strong>Channel type</strong>{group.kind?.replace("-", " ")}</span></div>
              {group.book && <button className="channelFeaturedBook" onClick={() => navigate(`/book/${group.book._id}`)}>{group.book.cover && <img src={group.book.cover} alt="" />}<span><small>Featured book</small><strong>{group.book.title}</strong><em>by {group.book.authorName}</em></span><FaBookOpen /></button>}
            </div>
          )}
        </main>
      </div>
    </>
  );
}
