import React, { useState, useEffect } from "react";
import "./Profile.css";
import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import BookCard from "../../components/bookCard/BookCard";
import API from "../../config/axios";
import { useNavigate, useParams } from "react-router-dom";
import { FaBookOpen, FaHeart, FaUsers, FaPen, FaCalendarAlt, FaEnvelope } from "react-icons/fa";

export default function Profile() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [profileUser, setProfileUser] = useState(null);
  const [books, setBooks] = useState([]);
  const [activeTab, setActiveTab] = useState("published");

  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isOwn = currentUser?.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userRes = await API.get(`/auth/user/${username}`);
        setProfileUser(userRes.data);

        const booksRes = await API.get("/books/all");
        setBooks(booksRes.data.filter(b => b.authorName === username));
      } catch (err) {
        console.error("Profile error:", err);
      }
    };
    fetchProfile();
  }, [username]);

  const joinDate = profileUser?.createdAt
    ? new Date(profileUser.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })
    : "";

  const avatar = profileUser?.avatar || profileUser?.profilePicture;
  const isFollowing = currentUser?.followings?.includes(profileUser?._id);

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await API.put(`/users/${profileUser._id}/unfollow`);

        // Update local currentUser
        const updatedUser = { ...currentUser, followings: currentUser.followings.filter(id => id !== profileUser._id) };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update profileUser state
        setProfileUser(prev => ({ ...prev, followers: prev.followers.filter(id => id !== currentUser._id) }));
      } else {
        await API.put(`/users/${profileUser._id}/follow`);

        // Update local currentUser
        const updatedUser = { ...currentUser, followings: [...(currentUser.followings || []), profileUser._id] };
        localStorage.setItem("user", JSON.stringify(updatedUser));

        // Update profileUser state
        setProfileUser(prev => ({ ...prev, followers: [...(prev.followers || []), currentUser._id] }));
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  const handleMessage = async () => {
    try {
      const res = await API.post("/messages/conversations", { recipientId: profileUser._id });
      navigate(`/messages/${res.data._id}`);
    } catch (err) {
      console.error("Message start error:", err);
    }
  };

  return (
    <>
      <Topbar />
      <div className="profilePage">
        <Sidebar />
        <div className="profileMain">
          {/* Cover Banner */}
          <div className="profileCover">
            <div className="profileCoverGradient"></div>
          </div>

          {/* Avatar + Info */}
          <div className="profileInfoSection">
            <div className="profileAvatarRing">
              <div className="profileAvatar">
                {avatar ? (
                  <img src={avatar} alt="" className="profileAvatarImg" />
                ) : (
                  <span>{(profileUser?.username || "U").charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="profileDetails">
              <h1 className="profileName">{profileUser?.username}</h1>
              <p className="profileBio">{profileUser?.bio || "A reader and writer on Pluma."}</p>
              <div className="profileMeta">
                <span className="profileMetaItem">
                  <FaCalendarAlt /> Joined {joinDate}
                </span>
              </div>
            </div>

            {isOwn ? (
              <button className="profileEditBtn" onClick={() => window.location.href = "/settings"}>
                <FaPen /> Edit Profile
              </button>
            ) : (
              <div className="profileSocialActions">
              <button
                className="profileMessageBtn"
                onClick={handleMessage}
              >
                <FaEnvelope /> Message
              </button>
              <button
                className={`profileEditBtn ${isFollowing ? 'following' : ''}`}
                onClick={handleFollow}
                style={isFollowing ? { background: 'var(--bg-glass)', color: 'var(--text-secondary)' } : {}}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </button>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="profileStats">
            <div className="profileStatCard">
              <FaPen className="profileStatIcon" />
              <span className="profileStatNumber">{books.length}</span>
              <span className="profileStatLabel">Published</span>
            </div>
            <div className="profileStatCard">
              <FaBookOpen className="profileStatIcon gold" />
              <span className="profileStatNumber">{profileUser?.readingStats?.booksRead || 0}</span>
              <span className="profileStatLabel">Books Read</span>
            </div>
            <div className="profileStatCard">
              <FaUsers className="profileStatIcon" />
              <span className="profileStatNumber">{profileUser?.followers?.length || 0}</span>
              <span className="profileStatLabel">Followers</span>
            </div>
            <div className="profileStatCard">
              <FaHeart className="profileStatIcon pink" />
              <span className="profileStatNumber">{profileUser?.followings?.length || 0}</span>
              <span className="profileStatLabel">Following</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="profileTabs">
            <button className={`profileTab ${activeTab === 'published' ? 'active' : ''}`}
              onClick={() => setActiveTab('published')}>
              Published Books
            </button>
            <button className={`profileTab ${activeTab === 'library' ? 'active' : ''}`}
              onClick={() => setActiveTab('library')}>
              Library
            </button>
            <button className={`profileTab ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}>
              About
            </button>
          </div>

          {/* Tab Content */}
          <div className="profileContent">
            {activeTab === "published" && (
              <div className="profileBooksGrid">
                {books.length > 0 ? books.map(b => (
                  <BookCard key={b._id} book={b} />
                )) : (
                  <div className="profileEmpty">
                    <p>No published books yet.</p>
                  </div>
                )}
              </div>
            )}
            {activeTab === "library" && (
              <div className="profileEmpty">
                <p>Library view coming soon.</p>
              </div>
            )}
            {activeTab === "about" && (
              <div className="profileAbout">
                <h3>About {profileUser?.username}</h3>
                <p>{profileUser?.bio || "This user hasn't added a bio yet."}</p>
                {profileUser?.city && <p><strong>City:</strong> {profileUser.city}</p>}
                {profileUser?.from && <p><strong>From:</strong> {profileUser.from}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
