import React, { useCallback, useEffect, useState } from "react";
import { FaFire, FaHashtag, FaUserFriends } from "react-icons/fa";
import { MdAutoAwesome, MdPeopleOutline, MdRefresh } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import SocialComposer from "../../components/social/SocialComposer";
import SocialPostCard from "../../components/social/SocialPostCard";
import API from "../../config/axios";
import "./Community.css";

const FEED_TABS = [
  { id: "latest", label: "Latest", icon: MdAutoAwesome },
  { id: "following", label: "Following", icon: FaUserFriends },
  { id: "trending", label: "Trending", icon: FaFire },
];

export default function Community() {
  const navigate = useNavigate();
  const [scope, setScope] = useState("latest");
  const [posts, setPosts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [people, setPeople] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/social/posts", { params: { scope } });
      setPosts(res.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "The community feed is unavailable.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    Promise.all([
      API.get("/groups"),
      API.get("/users/search"),
    ]).then(([groupRes, userRes]) => {
      setChannels((groupRes.data || []).slice(0, 5));
      setPeople((userRes.data || []).slice(0, 5));
    }).catch(() => {});
  }, []);

  const filteredPosts = posts.filter(post => {
    if (!query.trim()) return true;
    const needle = query.toLowerCase();
    return post.text?.toLowerCase().includes(needle) ||
      post.author?.username?.toLowerCase().includes(needle) ||
      post.book?.title?.toLowerCase().includes(needle);
  });

  return (
    <>
      <Topbar setQuery={setQuery} />
      <div className="communityPage">
        <Sidebar />
        <main className="communityMain">
          <header className="communityHeader">
            <span>Pluma Commons</span>
            <h1>Writers, readers, and stories in motion.</h1>
            <p>Share a line, ask for perspective, celebrate progress, or find the people who understand your fictional obsession.</p>
          </header>

          <SocialComposer onCreated={post => setPosts(current => [post, ...current])} />

          <nav className="communityTabs" aria-label="Community feed filters">
            {FEED_TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} className={scope === tab.id ? "active" : ""} onClick={() => setScope(tab.id)}>
                  <Icon /> {tab.label}
                </button>
              );
            })}
            <button className="communityRefresh" onClick={fetchPosts} aria-label="Refresh feed"><MdRefresh /></button>
          </nav>

          <div className="communityFeed" aria-live="polite">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => <div className="communityPostSkeleton skeleton" key={index} />)
            ) : error ? (
              <div className="communityFeedState"><p>{error}</p><button onClick={fetchPosts}>Try again</button></div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map(post => (
                <SocialPostCard key={post._id} initialPost={post} onDeleted={id => setPosts(current => current.filter(item => item._id !== id))} />
              ))
            ) : (
              <div className="communityFeedState">
                <MdPeopleOutline />
                <h2>{query ? "No matching conversations" : "Start the first conversation"}</h2>
                <p>{query ? "Try a different search." : "Share what you are reading, writing, or wondering about."}</p>
              </div>
            )}
          </div>
        </main>

        <aside className="communityRail">
          <section className="communityRailCard">
            <div className="communityRailTitle"><FaHashtag /> Active channels</div>
            {channels.map(channel => (
              <button className="communityChannelLink" key={channel._id} onClick={() => navigate(`/groups/${channel._id}`)}>
                <span>{channel.emoji || "💬"}</span>
                <div><strong>{channel.name}</strong><small>{channel.members?.length || 0} members · {channel.kind?.replace("-", " ")}</small></div>
              </button>
            ))}
            <button className="communityRailMore" onClick={() => navigate("/groups")}>Explore all channels</button>
          </section>

          <section className="communityRailCard">
            <div className="communityRailTitle"><FaUserFriends /> Readers to meet</div>
            {people.map(person => {
              const avatar = person.avatar || person.profilePicture;
              return (
                <button className="communityPersonLink" key={person._id} onClick={() => navigate(`/profile/${person.username}`)}>
                  <div>{avatar ? <img src={avatar} alt="" /> : person.username.charAt(0).toUpperCase()}</div>
                  <span><strong>{person.username}</strong><small>{person.bio || "Reader & writer"}</small></span>
                </button>
              );
            })}
          </section>
        </aside>
      </div>
    </>
  );
}
